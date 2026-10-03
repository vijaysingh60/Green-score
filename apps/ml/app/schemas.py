"""Request/response shapes. Mirrors packages/types/src/ml.ts (the API <-> ML contract).

Fields may be ADDED (optional), never renamed or removed.
"""
from typing import Any, Literal

from pydantic import BaseModel, Field


class BuildingContext(BaseModel):
    type: str
    builtUpArea: float = Field(gt=0, description="Square metres")
    occupants: int = Field(ge=0)
    numberOfFloors: int = Field(ge=1)
    yearConstructed: int


class PredictRequest(BaseModel):
    buildingId: str
    assessmentId: str | None = None
    building: BuildingContext
    # Same shape as the assessment parameters: {"energy": {"solarInstalled": true, ...}, ...}
    parameters: dict[str, dict[str, Any]]


class FeatureImportance(BaseModel):
    feature: str
    importance: float


class PredictResponse(BaseModel):
    status: Literal["OK", "NOT_IMPLEMENTED"]
    predictedScore: float | None
    modelVersion: str | None
    featureImportance: list[FeatureImportance]
    metadata: dict[str, Any]
    # Always true: an ML score is advisory and never becomes the final score by itself.
    advisory: Literal[True] = True
    message: str | None = None


class TrainRequest(BaseModel):
    triggeredBy: str | None = None


class TrainResponse(BaseModel):
    status: Literal["QUEUED", "NOT_IMPLEMENTED"]
    runId: str | None
    modelVersion: str | None
    message: str | None = None


class Metrics(BaseModel):
    mae: float
    rmse: float
    r2: float


class ModelStatus(BaseModel):
    status: Literal["NO_MODEL", "READY"]
    activeVersion: str | None
    metrics: Metrics | None
    trainedAt: str | None
    message: str | None = None
