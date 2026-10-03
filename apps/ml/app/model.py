"""A deliberately simple demo model.

HACKATHON MVP: the model is trained at startup on SYNTHETIC data (no real buildings). It exists to
demonstrate the "advisory ML score next to the rule-based score" idea end to end. It is not a
trustworthy predictor, and its output must never be shown as an official score.

Features are "goodness" fractions in [0, 1] for every assessment parameter, plus three context
features. The FEATURES list mirrors the parameter registry in packages/shared/src/parameters.ts.
"""
from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any

import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.model_selection import train_test_split

MODEL_VERSION = "rf-synthetic-v1"
ALGORITHM = "RandomForestRegressor (scikit-learn)"

# (category, parameter, kind)   kinds: b=boolean, p=percent, l=level, and numeric transforms below
FEATURES: list[tuple[str, str, str]] = [
    ("energy", "electricityConsumption", "eui"),
    ("energy", "solarInstalled", "b"),
    ("energy", "solarCapacity", "solar"),
    ("energy", "energyEfficientLighting", "p"),
    ("energy", "energyEfficientAppliances", "p"),
    ("energy", "hvacEfficiency", "l"),
    ("energy", "energyMonitoring", "b"),
    ("water", "waterConsumption", "lpcd"),
    ("water", "rainwaterHarvesting", "b"),
    ("water", "rainwaterHarvestingCapacity", "rain"),
    ("water", "greywaterRecycling", "b"),
    ("water", "wastewaterTreatment", "b"),
    ("water", "recycledWaterUsage", "p"),
    ("water", "waterEfficientFixtures", "p"),
    ("waste", "wasteSegregation", "b"),
    ("waste", "composting", "b"),
    ("waste", "recycling", "b"),
    ("waste", "eWasteManagement", "b"),
    ("waste", "wetWasteManagement", "b"),
    ("waste", "dryWasteManagement", "b"),
    ("greenCover", "greenAreaPercentage", "p"),
    ("greenCover", "treeCount", "trees"),
    ("greenCover", "rooftopGarden", "b"),
    ("greenCover", "greenRoof", "b"),
    ("greenCover", "shadedAreas", "p"),
    ("greenCover", "permeableSurfaces", "p"),
    ("materials", "sustainableMaterials", "p"),
    ("materials", "localMaterials", "p"),
    ("materials", "recycledMaterials", "p"),
    ("materials", "efficientWindows", "b"),
    ("materials", "insulation", "l"),
    ("indoorEnvironment", "ventilation", "l"),
    ("indoorEnvironment", "indoorAirQuality", "l"),
    ("indoorEnvironment", "daylight", "l"),
    ("indoorEnvironment", "thermalComfort", "l"),
    ("mobility", "evCharging", "b"),
    ("mobility", "bicycleParking", "b"),
    ("mobility", "publicTransportAccessibility", "l"),
    ("climateResilience", "coolRoof", "b"),
    ("climateResilience", "naturalVentilation", "l"),
    ("climateResilience", "heatReduction", "l"),
    ("climateResilience", "floodWaterManagement", "b"),
    ("climateResilience", "greenInfrastructure", "b"),
]
CONTEXT_FEATURES = ["context.floors", "context.log_area", "context.age"]
FEATURE_NAMES = [f"{c}.{p}" for c, p, _ in FEATURES] + CONTEXT_FEATURES

LEVELS = {"NONE": 0.0, "BASIC": 0.4, "GOOD": 0.75, "EXCELLENT": 1.0}
CATEGORY_POINTS = {
    "energy": 25, "water": 20, "waste": 15, "greenCover": 10,
    "materials": 10, "indoorEnvironment": 5, "mobility": 5, "climateResilience": 10,
}


def _clip01(x: float) -> float:
    return float(min(1.0, max(0.0, x)))


def _goodness(kind: str, value: Any, area: float, occupants: int) -> float:
    """Turn a raw parameter value into a 0..1 'how good is this' fraction. Missing -> 0."""
    if value is None:
        return 0.0
    ksqm = max(area / 1000.0, 0.5)
    try:
        if kind == "b":
            return 1.0 if value is True else 0.0
        if kind == "p":
            return _clip01(float(value) / 100.0)
        if kind == "l":
            return LEVELS.get(str(value), 0.0)
        v = float(value)
        if v <= 0:
            return 0.0
        if kind == "eui":
            return _clip01((220.0 - v / area) / (220.0 - 50.0))
        if kind == "lpcd":
            if occupants <= 0:
                return 0.0
            return _clip01((150.0 - v * 1000.0 / 365.0 / occupants) / (150.0 - 50.0))
        if kind == "solar":
            return _clip01(v / ksqm / 30.0)
        if kind == "rain":
            return _clip01(v / ksqm / 20.0)
        if kind == "trees":
            return _clip01(v / ksqm / 12.0)
    except (TypeError, ValueError):
        return 0.0
    return 0.0


def extract_features(parameters: dict[str, dict[str, Any]], building: dict[str, Any]) -> list[float]:
    area = float(building["builtUpArea"])
    occupants = int(building["occupants"])
    row = [
        _goodness(kind, (parameters.get(cat) or {}).get(param), area, occupants)
        for cat, param, kind in FEATURES
    ]
    age = max(0, datetime.now().year - int(building["yearConstructed"]))
    row += [min(int(building["numberOfFloors"]), 50) / 50.0, float(np.log10(max(area, 1.0))) / 5.0, min(age, 100) / 100.0]
    return row


# --- Synthetic training data -------------------------------------------------

def _synthetic_label(x: np.ndarray, rng: np.random.Generator, index: dict[str, int]) -> np.ndarray:
    """An independent 'expert opinion' used as the synthetic ground truth.

    It weights parameters differently from the rule-based engine, adds a couple of interaction
    effects and noise, so the learned model is a genuine second opinion rather than a copy.
    """
    weights = np.random.default_rng(7).dirichlet(np.ones(len(FEATURES)) * 4.0)
    per_category = np.zeros(x.shape[0])
    for cat, points in CATEGORY_POINTS.items():
        cols = [i for i, (c, _, _) in enumerate(FEATURES) if c == cat]
        w = weights[cols] / weights[cols].sum()
        per_category += points * (x[:, cols] @ w)
    synergy = 3.0 * x[:, index["energy.solarInstalled"]] * x[:, index["energy.energyMonitoring"]]
    comfort = 2.5 * x[:, index["climateResilience.coolRoof"]] * x[:, index["climateResilience.heatReduction"]]
    age_penalty = 4.0 * x[:, index["context.age"]] * (1.0 - x[:, index["materials.insulation"]])
    noise = rng.normal(0.0, 2.0, x.shape[0])
    return np.clip(per_category + synergy + comfort - age_penalty + noise, 0.0, 100.0)


def _synthetic_dataset(n: int, seed: int) -> tuple[pd.DataFrame, np.ndarray]:
    rng = np.random.default_rng(seed)
    index = {name: i for i, name in enumerate(FEATURE_NAMES)}
    strength = rng.beta(2.0, 2.2, n)  # how sustainable each synthetic building is overall
    x = np.zeros((n, len(FEATURE_NAMES)))
    for i, (_, _, kind) in enumerate(FEATURES):
        base = np.clip(strength + rng.normal(0.0, 0.25, n), 0.0, 1.0)
        if kind == "b":
            x[:, i] = (rng.random(n) < base).astype(float)
        elif kind == "l":
            x[:, i] = np.select([base < 0.15, base < 0.45, base < 0.75], [0.0, 0.4, 0.75], default=1.0)
        else:
            x[:, i] = base
    x[:, index["context.floors"]] = rng.integers(1, 30, n) / 50.0
    x[:, index["context.log_area"]] = rng.uniform(3.0, 4.9, n) / 5.0
    x[:, index["context.age"]] = rng.integers(0, 50, n) / 100.0
    return pd.DataFrame(x, columns=FEATURE_NAMES), _synthetic_label(x, rng, index)


# --- Model wrapper -----------------------------------------------------------

@dataclass
class TrainedModel:
    estimator: RandomForestRegressor
    mae: float
    rmse: float
    r2: float
    trained_at: str
    dataset_size: int


def train_demo_model(n: int = 3000, seed: int = 42) -> TrainedModel:
    features, labels = _synthetic_dataset(n, seed)
    x_train, x_test, y_train, y_test = train_test_split(features, labels, test_size=0.2, random_state=seed)
    estimator = RandomForestRegressor(n_estimators=120, max_depth=10, min_samples_leaf=3, random_state=seed, n_jobs=1)
    estimator.fit(x_train, y_train)
    predicted = estimator.predict(x_test)
    return TrainedModel(
        estimator=estimator,
        mae=round(float(mean_absolute_error(y_test, predicted)), 2),
        rmse=round(float(np.sqrt(mean_squared_error(y_test, predicted))), 2),
        r2=round(float(r2_score(y_test, predicted)), 3),
        trained_at=datetime.now(timezone.utc).isoformat(),
        dataset_size=n,
    )


def predict(model: TrainedModel, parameters: dict[str, dict[str, Any]], building: dict[str, Any]) -> tuple[float, list[dict[str, float]]]:
    row = pd.DataFrame([extract_features(parameters, building)], columns=FEATURE_NAMES)
    score = float(np.clip(model.estimator.predict(row)[0], 0.0, 100.0))
    importances = sorted(
        zip(FEATURE_NAMES, model.estimator.feature_importances_), key=lambda pair: pair[1], reverse=True
    )[:8]
    return round(score, 1), [{"feature": name, "importance": round(float(value), 4)} for name, value in importances]
