/**
 * All Mongoose models. Importing this file registers every collection.
 *
 * Relationships (references use ObjectId; embedded data is noted):
 *
 *   User 1──* Building                 Building.owner
 *   Building 1──* BuildingAssessment   BuildingAssessment.buildingId  (immutable versions;
 *                                      parameters are EMBEDDED, generated from the registry)
 *   Building 1──1 Score                Score.buildingId  (unique; four score slots EMBEDDED)
 *   Building 1──* Document             Document.buildingId
 *   Building 1──* Verification         Verification.buildingId (+ assessmentId, adminId)
 *   Building 1──* Recommendation       Recommendation.buildingId
 *   Building 1──* MLPrediction         MLPrediction.buildingId (+ assessmentId)
 *   MLPrediction 1──* MLFeedback       MLFeedback.predictionId (+ verificationId = human truth)
 *   MLModel / MLTrainingRun            linked by the `version` string
 *   AuditLog                           (entity, entityId) points at any of the above
 */
export { User, type UserDoc } from './user.model';
export { Building, type BuildingDoc } from './building.model';
export { BuildingAssessment, type BuildingAssessmentDoc } from './building-assessment.model';
export { toStoredParameters } from './assessment.schema';
export { ScoreModel, type ScoreDoc } from './score.model';
export { DocumentModel, type DocumentRecord } from './document.model';
export { Verification, type VerificationDoc } from './verification.model';
export { Recommendation, type RecommendationDoc } from './recommendation.model';
export { MLPrediction, type MLPredictionDoc } from './ml-prediction.model';
export { MLFeedback, type MLFeedbackDoc } from './ml-feedback.model';
export { MLModelRecord, type MLModelDoc } from './ml-model.model';
export { MLTrainingRun, type MLTrainingRunDoc } from './ml-training-run.model';
export { AuditLog, type AuditLogDoc } from './audit-log.model';
