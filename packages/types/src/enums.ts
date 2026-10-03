/**
 * Shared enumerations.
 *
 * Each enum is a `const` tuple plus a derived union type, so the same list drives
 * TypeScript types, Mongoose `enum` options and zod validators with no duplication.
 *
 * Keep ONE VALUE PER LINE: three branches will add values in parallel and this keeps
 * merges conflict-free.
 */

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------

export const USER_ROLES = [
  'USER',
  'ADMIN',
] as const;
export type UserRole = (typeof USER_ROLES)[number];

// ---------------------------------------------------------------------------
// Buildings
// ---------------------------------------------------------------------------

export const BUILDING_TYPES = [
  'RESIDENTIAL',
  'OFFICE',
  'COMMERCIAL',
  'RETAIL',
  'EDUCATIONAL',
  'HEALTHCARE',
  'HOSPITALITY',
  'INDUSTRIAL',
  'MIXED_USE',
  'OTHER',
] as const;
export type BuildingType = (typeof BUILDING_TYPES)[number];

/**
 * Lifecycle of a building's score. A building is only treated as publicly
 * verified when its status is `VERIFIED` (and it is not demo data).
 *
 *   DRAFT -> SUBMITTED -> UNDER_REVIEW -> VERIFIED
 *                                      -> REJECTED -> (owner edits) -> SUBMITTED ...
 */
export const VERIFICATION_STATUSES = [
  'DRAFT',
  'SUBMITTED',
  'UNDER_REVIEW',
  'VERIFIED',
  'REJECTED',
] as const;
export type VerificationStatus = (typeof VERIFICATION_STATUSES)[number];
/** `Building.status` uses the same lifecycle; this alias keeps call sites readable. */
export type BuildingStatus = VerificationStatus;

// ---------------------------------------------------------------------------
// Sustainability framework
// ---------------------------------------------------------------------------

/** The eight scored categories. These keys are used everywhere (breakdowns, assessments, config). */
export const CATEGORY_KEYS = [
  'energy',
  'water',
  'waste',
  'greenCover',
  'materials',
  'indoorEnvironment',
  'mobility',
  'climateResilience',
] as const;
export type CategoryKey = (typeof CATEGORY_KEYS)[number];

/** Ordinal answer for parameters that are "how good is it" rather than yes/no. */
export const QUALITY_LEVELS = [
  'NONE',
  'BASIC',
  'GOOD',
  'EXCELLENT',
] as const;
export type QualityLevel = (typeof QUALITY_LEVELS)[number];

/** Which of the four separate score slots a value belongs to. Never mix them. */
export const SCORE_KINDS = [
  'preliminary',
  'mlPredicted',
  'projected',
  'verified',
] as const;
export type ScoreKind = (typeof SCORE_KINDS)[number];

// ---------------------------------------------------------------------------
// Verification & documents
// ---------------------------------------------------------------------------

export const PARAMETER_VERIFICATION_STATUSES = [
  'VERIFIED',
  'PARTIALLY_VERIFIED',
  'NOT_VERIFIED',
  'MORE_EVIDENCE_REQUIRED',
] as const;
export type ParameterVerificationStatus = (typeof PARAMETER_VERIFICATION_STATUSES)[number];

export const DOCUMENT_VERIFICATION_STATUSES = [
  'PENDING',
  'VERIFIED',
  'REJECTED',
  'MORE_EVIDENCE_REQUIRED',
] as const;
export type DocumentVerificationStatus = (typeof DOCUMENT_VERIFICATION_STATUSES)[number];

/** A document supports one sustainability category, or the building in general. */
export const DOCUMENT_CATEGORIES = [
  ...CATEGORY_KEYS,
  'general',
] as const;
export type DocumentCategory = (typeof DOCUMENT_CATEGORIES)[number];

export const DOCUMENT_TYPES = [
  'ELECTRICITY_BILL',
  'WATER_BILL',
  'SOLAR_INSTALLATION_PROOF',
  'RAINWATER_HARVESTING_PROOF',
  'WASTE_MANAGEMENT_RECORD',
  'SITE_PHOTO',
  'BUILDING_PLAN',
  'CERTIFICATION',
  'OTHER',
] as const;
export type DocumentType = (typeof DOCUMENT_TYPES)[number];

// ---------------------------------------------------------------------------
// Recommendations
// ---------------------------------------------------------------------------

export const RECOMMENDATION_SOURCES = [
  'RULE_BASED',
  'ML',
  'AI',
] as const;
export type RecommendationSource = (typeof RECOMMENDATION_SOURCES)[number];

export const RECOMMENDATION_PRIORITIES = [
  'LOW',
  'MEDIUM',
  'HIGH',
] as const;
export type RecommendationPriority = (typeof RECOMMENDATION_PRIORITIES)[number];

// ---------------------------------------------------------------------------
// ML
// ---------------------------------------------------------------------------

/** A freshly trained model starts at TRAINING -> AWAITING_APPROVAL. It is never auto-activated. */
export const ML_MODEL_STATUSES = [
  'TRAINING',
  'AWAITING_APPROVAL',
  'ACTIVE',
  'REJECTED',
  'ARCHIVED',
] as const;
export type MLModelStatus = (typeof ML_MODEL_STATUSES)[number];

export const ML_TRAINING_RUN_STATUSES = [
  'QUEUED',
  'RUNNING',
  'COMPLETED',
  'FAILED',
] as const;
export type MLTrainingRunStatus = (typeof ML_TRAINING_RUN_STATUSES)[number];

// ---------------------------------------------------------------------------
// Audit
// ---------------------------------------------------------------------------

/** Collections that may appear as the subject of an audit entry. */
export const AUDIT_ENTITIES = [
  'User',
  'Building',
  'BuildingAssessment',
  'Score',
  'Document',
  'Verification',
  'Recommendation',
  'MLPrediction',
  'MLFeedback',
  'MLModel',
  'MLTrainingRun',
] as const;
export type AuditEntity = (typeof AUDIT_ENTITIES)[number];

export const AUDIT_ACTIONS = [
  'CREATE',
  'UPDATE',
  'DELETE',
  'STATUS_CHANGED',
  'SCORE_PRELIMINARY_CALCULATED',
  'SCORE_PROJECTED_CALCULATED',
  'SCORE_ML_RECORDED',
  'SCORE_VERIFIED',
  'SCORE_REJECTED',
  'SCORE_OVERRIDDEN',
  'DOCUMENT_REVIEWED',
  'MODEL_TRAINED',
  'MODEL_APPROVED',
  'MODEL_REJECTED',
  'MODEL_ARCHIVED',
] as const;
export type AuditAction = (typeof AUDIT_ACTIONS)[number];

// ---------------------------------------------------------------------------
// API
// ---------------------------------------------------------------------------

export const API_ERROR_CODES = [
  'BAD_REQUEST',
  'VALIDATION_ERROR',
  'UNAUTHENTICATED',
  'FORBIDDEN',
  'NOT_FOUND',
  'CONFLICT',
  'RATE_LIMITED',
  'NOT_IMPLEMENTED',
  'SERVICE_UNAVAILABLE',
  'INTERNAL_ERROR',
] as const;
export type ApiErrorCode = (typeof API_ERROR_CODES)[number];
