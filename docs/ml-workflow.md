# ML workflow (MVP)

The ML score is **advisory only**. It is shown next to the rule-based score, stored in its own field, and never becomes
the final score. The final score is always a human admin's decision.

## Service (`apps/ml`)

A small FastAPI app. At startup it trains a scikit-learn `RandomForestRegressor` on **synthetic data** (about a second).
That synthetic "ground truth" is an independent expert-style formula (different weights, a few interaction effects,
noise), so the model is a second opinion rather than a copy of the rule engine. It is a demo, not a trustworthy
predictor, and says so in its responses.

| Endpoint | Behaviour |
|---|---|
| `GET /health` | `{ status, modelLoaded }` |
| `POST /predict` | `MLPredictResponse` (`predictedScore`, `modelVersion`, top feature importances, `advisory: true`) |
| `GET /model/status` | active version + MAE / RMSE / R² on a held-out synthetic split |
| `POST /train` | `501`: automatic retraining is out of scope for the MVP |

## Flow

1. Owner submits a building. The API computes the preliminary score, then calls `POST /predict`.
2. If the service is down or returns no score, the API stores a prediction with `modelVersion: "simulated-fallback"`.
3. The result is saved as `MLPrediction` and in `Score.mlPredictedScore` (its own slot).
4. The admin sees preliminary + ML side by side, decides, and publishes `finalVerifiedScore`.
5. On verification the API stores an `MLFeedback` row: ML score, **human-verified score**, absolute error, model version.
   Only human-verified scores count as ground truth.
6. **Admin → ML & feedback** shows the model status and the ML-vs-human comparison.

## Later (not built)

Train on real verified feedback; model approval step (`MLModel` status `AWAITING_APPROVAL` → `ACTIVE`, never
automatic; the schema already enforces that an ACTIVE model has an approver and that only one model is ACTIVE);
`MLTrainingRun` tracking. The models and the feature list in `apps/ml/app/model.py` mirror the parameter registry.
