"""GREENScore ML service (hackathon MVP).

Advisory predictions only: an ML score is shown next to the rule-based score and never becomes
the final score. The final score is always a human admin's decision.
"""
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.responses import JSONResponse

from . import model as ml
from .schemas import (
    FeatureImportance,
    Metrics,
    ModelStatus,
    PredictRequest,
    PredictResponse,
    TrainRequest,
    TrainResponse,
)

state: dict[str, ml.TrainedModel] = {}


@asynccontextmanager
async def lifespan(_: FastAPI):
    # Train the demo model once at startup (about a second, on synthetic data).
    state["model"] = ml.train_demo_model()
    yield


app = FastAPI(
    title="GREENScore ML Service",
    version="0.1.0",
    description="Advisory green-score predictions. Demo model trained on synthetic data.",
    lifespan=lifespan,
)


@app.get("/health")
def health() -> dict:
    return {"status": "ok", "service": "greenscore-ml", "modelLoaded": "model" in state}


@app.post("/predict", response_model=PredictResponse)
def predict(request: PredictRequest) -> PredictResponse:
    trained = state["model"]
    score, importance = ml.predict(trained, request.parameters, request.building.model_dump())
    return PredictResponse(
        status="OK",
        predictedScore=score,
        modelVersion=ml.MODEL_VERSION,
        featureImportance=[FeatureImportance(**item) for item in importance],
        metadata={
            "trainedOn": "synthetic data (demo)",
            "algorithm": ml.ALGORITHM,
            "buildingId": request.buildingId,
            "assessmentId": request.assessmentId,
        },
        message="Advisory only. Not an official score.",
    )


@app.post("/train", response_model=TrainResponse)
def train(_: TrainRequest | None = None) -> JSONResponse:
    # Retraining is intentionally out of scope for the MVP: a human-approved flow comes later.
    body = TrainResponse(
        status="NOT_IMPLEMENTED",
        runId=None,
        modelVersion=None,
        message="Automatic retraining is not part of the MVP. Feedback is stored for later.",
    )
    return JSONResponse(status_code=501, content=body.model_dump())


@app.get("/model/status", response_model=ModelStatus)
def model_status() -> ModelStatus:
    trained = state.get("model")
    if trained is None:
        return ModelStatus(status="NO_MODEL", activeVersion=None, metrics=None, trainedAt=None)
    return ModelStatus(
        status="READY",
        activeVersion=ml.MODEL_VERSION,
        metrics=Metrics(mae=trained.mae, rmse=trained.rmse, r2=trained.r2),
        trainedAt=trained.trained_at,
        message=f"{ml.ALGORITHM} trained on {trained.dataset_size} synthetic buildings (demo data).",
    )
