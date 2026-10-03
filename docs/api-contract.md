# API contract

Base URL: `http://localhost:4000`. JSON only. Types live in `packages/types` (`api.ts`, `models.ts`).

**Success:** `{ "data": ..., "meta"?: ... }`  ·  **Error:** `{ "error": { "code", "message", "details"? } }`

Error codes: `VALIDATION_ERROR` (422), `BAD_REQUEST` (400), `UNAUTHENTICATED` (401), `FORBIDDEN` (403),
`NOT_FOUND` (404), `CONFLICT` (409), `INTERNAL_ERROR` (500).

## Public

| Method | Path | Returns |
|---|---|---|
| GET | `/api/health` | `HealthStatus` (503 while the DB is down) |
| GET | `/api/buildings` | `MapBuilding[]`, **only `status = VERIFIED`** (demo buildings included, `isDemo: true`) |
| GET | `/api/buildings/:id` | `BuildingProfile` |
| POST | `/api/buildings` | `BuildingProfile` (201). Creates building + assessment, computes the preliminary score, asks the ML service for an advisory prediction, builds recommendations. Status becomes `SUBMITTED`. |

`POST /api/buildings` body (`SubmitBuildingInput`):

```json
{
  "building": { "name": "...", "type": "OFFICE", "address": "...", "locality": "Gachibowli", "pincode": "500032",
                "latitude": 17.44, "longitude": 78.35, "yearConstructed": 2016, "numberOfFloors": 9,
                "builtUpArea": 20000, "occupants": 1400 },
  "parameters": { "energy": { "solarInstalled": true, "solarCapacity": 120 }, "water": { }, "...": {} },
  "documents": [ { "fileName": "Bills.pdf", "documentType": "ELECTRICITY_BILL", "category": "energy" } ]
}
```

Unknown parameter names are rejected (strict). Coordinates must be inside the Hyderabad region.
`BuildingProfile` = `{ building, parameters, score, recommendations, carbon, history, feedback, documents }`.
`score` has all four slots; **only `score.finalVerifiedScore` with `verificationStatus: "VERIFIED"` is official.**

## Admin (header `x-admin-passcode: <ADMIN_PASSCODE>`; a demo gate, not real auth)

| Method | Path | Returns |
|---|---|---|
| GET | `/api/admin/ping` | `{ ok: true }` (used by the web login) |
| GET | `/api/admin/buildings` | `AdminBuildingRow[]` (non-draft, pending first) |
| GET | `/api/admin/buildings/:id` | `BuildingProfile` |
| POST | `/api/admin/buildings/:id/verify` | `VerifyResult` |
| GET | `/api/admin/ml-feedback` | `MLFeedbackSummary` (rows + mean absolute error) |
| GET | `/api/admin/ml-status` | ML service status, or `{ reachable: false }` |

`verify` body (`VerifyInput`): `{ "decision": "VERIFY" | "REJECT", "finalScore"?: 0-100, "reason"?: string }`.
`VERIFY` sets status `VERIFIED` and writes `finalVerifiedScore` (defaults to the preliminary total; the admin may
adjust it, and the breakdown is scaled to match), creates a `Verification`, an audit entry, and an `MLFeedback` row
(ML vs human). `REJECT` sets `REJECTED`. A verified building returns `409` if verified again. The preliminary and ML
scores are never changed.

## ML service (called by the API, `ML_SERVICE_URL`)

`GET /health` · `POST /predict` · `GET /model/status` · `POST /train` (501 in the MVP). Contract types are in
`packages/types/src/ml.ts`; see `docs/ml-workflow.md`.
