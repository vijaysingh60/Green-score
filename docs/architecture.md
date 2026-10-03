# Architecture

Hackathon MVP. Simple on purpose: everything not needed for the demo is left out.

```
Browser ──► apps/web (Next.js)  ──► apps/api (Express) ──► MongoDB
                                         │
                                         └──► apps/ml (FastAPI)   (optional; simulated fallback)
Shared code:  packages/types · packages/shared · packages/ui
```

## Key decisions

- **One scoring engine, shared.** `packages/shared` holds the scoring config + pure engine. The API uses it for
  authoritative scores; the web uses the *same* functions for the live form preview and the what-if simulator. No
  scoring logic lives in React components.
- **Parameter registry = single source of truth.** `packages/shared/src/parameters.ts` defines every assessment
  parameter. The Mongoose schema and the zod validators are *generated* from it, and mapped types make the compiler
  reject a registry/config that drifts from the `AssessmentParameters` type. To add a parameter: add the field to
  `packages/types/src/parameters.ts`, then a definition in the registry, then a weight in `scoring/config.ts`.
- **Four separate score slots.** `Score` holds `preliminaryScore`, `mlPredictedScore`, `projectedScore` and
  `finalVerifiedScore` as separate sub-documents. Each is written only by its own producer. The final slot is written
  only by `verifyBuilding()` (admin) and is guarded by a schema validator.
- **Demo data is always flagged.** Seeded buildings have `isDemo: true`. `getScoreDisplay()` never labels a demo
  score "Verified Green Score". Real buildings are only public when `status === 'VERIFIED'`.
- **Packages ship TypeScript source** (no build step); Next transpiles them, the API bundles them with esbuild.
- **Graceful ML.** If the ML service is down the API stores a labelled `simulated-fallback` prediction instead.

## Data model (MongoDB / Mongoose)

| Collection | Notes |
|---|---|
| `buildings` | location (+ GeoJSON `location`, 2dsphere), `status`, `isDemo` |
| `buildingassessments` | immutable versions; `parameters` embedded (generated schema) |
| `scores` | one per building; four embedded score slots; `isDemo` |
| `recommendations` | rule-based, linked to the improvements catalogue |
| `documents` | MOCK records (name only, no upload) |
| `verifications` | an admin decision, with snapshots of the scores shown |
| `mlpredictions`, `mlfeedbacks` | advisory prediction; ML vs human-verified score |
| `mlmodels`, `mltrainingruns` | defined for later (ML approval flow); unused in the MVP |
| `auditlogs` | append-only record of score changes |
| `users` | defined for later; unused in the MVP |

Relationships are by `buildingId` (and `assessmentId`, `predictionId`, `verificationId` where relevant).

## What to harden first (post-hackathon)

1. Real auth + roles (replace the shared admin passcode; `Building.owner`, `Verification.adminId` are ready).
2. Real document upload behind a storage interface (S3/R2); today documents are mock records.
3. Authenticated, owner-scoped access to non-verified buildings (today anyone with the link can view one).
4. MongoDB transactions for the verify action (needs a replica set) and rate limiting.
5. ML: train on real verified feedback, add a human model-approval step (models must never self-activate).
