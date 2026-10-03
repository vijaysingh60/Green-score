import type {
  AuditAction,
  AuditEntity,
  BuildingType,
  CategoryKey,
  DocumentCategory,
  DocumentType,
  DocumentVerificationStatus,
  MLModelStatus,
  MLTrainingRunStatus,
  ParameterVerificationStatus,
  RecommendationPriority,
  RecommendationSource,
  UserRole,
  VerificationStatus,
} from './enums';
import type { AssessmentParameters, ExtraParameters } from './parameters';

/**
 * Wire-format domain types (what the API returns as JSON).
 * IDs are strings, dates are ISO-8601 strings. Mongoose documents are mapped to these by
 * `toJSON` (`_id` -> `id`, `__v` and secrets removed).
 */

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  createdAt: string;
  updatedAt: string;
}

/** What auth middleware attaches to `req.user`. */
export type AuthUser = Pick<User, 'id' | 'name' | 'email' | 'role'>;

// ---------------------------------------------------------------------------
// Buildings
// ---------------------------------------------------------------------------

export interface Building {
  id: string;
  name: string;
  type: BuildingType;
  address: string;
  locality: string;
  city: string;
  pincode: string;
  latitude: number;
  longitude: number;
  yearConstructed: number;
  numberOfFloors: number;
  /** Built-up area in square metres. */
  builtUpArea: number;
  occupants: number;
  /** User id of the owner / submitter. */
  owner: string;
  status: VerificationStatus;
  /** Sample data for development. Never treat a demo building as a real verified building. */
  isDemo: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Minimal shape for the Hyderabad map and list views. */
export interface MapBuilding {
  id: string;
  name: string;
  type: BuildingType;
  locality: string;
  latitude: number;
  longitude: number;
  status: VerificationStatus;
  isDemo: boolean;
  /** Admin-verified total, or null. Demo buildings carry a *sample* value here, see `isDemo`. */
  finalVerifiedScore: number | null;
}

/** Building profile. `owner` is only present for the owner and admins. */
export interface BuildingDetail extends Omit<Building, 'owner'> {
  owner?: string;
  finalVerifiedScore: number | null;
  verifiedBreakdown: ScoreBreakdown | null;
  verifiedAt: string | null;
}

// ---------------------------------------------------------------------------
// Assessments
// ---------------------------------------------------------------------------

/** One submitted set of sustainability parameters. Immutable; edits create a new `version`. */
export interface Assessment {
  id: string;
  buildingId: string;
  /** 1, 2, 3 ... per building. The highest version is the current one. */
  version: number;
  /** Version of the parameter set, bump when parameters are added or change meaning. */
  schemaVersion: string;
  parameters: AssessmentParameters;
  /** Parameters not yet promoted into the typed model. Stored, never scored. */
  extra?: ExtraParameters;
  notes?: string;
  submittedBy: string;
  createdAt: string;
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// Scores: four separate slots, never overwritten by one another
// ---------------------------------------------------------------------------

/** Points earned per category (each capped by that category's max points). */
export type ScoreBreakdown = Record<CategoryKey, number>;

/** Output of the scoring engine. */
export interface ScoreResult {
  totalScore: number;
  breakdown: ScoreBreakdown;
}

/** 1. Deterministic, rule-based. Calculated automatically from an assessment. */
export interface PreliminaryScore extends ScoreResult {
  methodologyVersion: string;
  /** "category.parameter" entries that could not be scored (e.g. missing building area). */
  unscoredParameters: string[];
  calculatedAt: string;
}

/** 2. Produced by the ML service. ADVISORY ONLY. Never the final authority. */
export interface MLPredictedScore {
  totalScore: number;
  breakdown?: Partial<ScoreBreakdown>;
  modelVersion: string;
  predictionId?: string;
  predictedAt: string;
}

export interface ProjectedScenario {
  name: string;
  description?: string;
  /** Parameter overrides applied on top of the current assessment. */
  changes: AssessmentParameters;
}

/** 3. "What if" result for an improvement scenario. Never persisted as the building's score. */
export interface ProjectedScore extends ScoreResult {
  methodologyVersion: string;
  scenario: ProjectedScenario;
  baselineTotalScore: number;
  calculatedAt: string;
}

/**
 * 4. The admin's decision. Only `verificationStatus === 'VERIFIED'` makes `totalScore`
 * an official "Verified Green Score". For REJECTED / UNDER_REVIEW the total stays null.
 */
export interface FinalScore {
  verificationStatus: VerificationStatus;
  totalScore: number | null;
  breakdown: ScoreBreakdown | null;
  verifiedBy: string | null;
  verifiedAt: string | null;
  verificationReason: string | null;
  verificationId: string | null;
  methodologyVersion: string;
}

/** One document per building holding the current value of each score slot. */
export interface Score {
  id: string;
  buildingId: string;
  /** Assessment the preliminary score was calculated from. */
  assessmentId: string | null;
  preliminaryScore: PreliminaryScore | null;
  mlPredictedScore: MLPredictedScore | null;
  projectedScore: ProjectedScore | null;
  finalVerifiedScore: FinalScore | null;
  createdAt: string;
  updatedAt: string;
}

/** What anyone who is not the owner or an admin may see of a score. */
export interface PublicScore {
  buildingId: string;
  finalVerifiedScore: FinalScore;
}

// ---------------------------------------------------------------------------
// Profile extras
// ---------------------------------------------------------------------------

/** Indicative operational carbon estimate from electricity use. Not an audited footprint. */
export interface CarbonEstimate {
  annualElectricityKwh: number;
  /** Tonnes CO2e per year from grid electricity. */
  annualTonnesCO2e: number;
  kgCO2ePerSqm: number;
  /** Tonnes CO2e per year avoided by on-site solar, when solar capacity is reported. */
  solarAvoidedTonnesCO2e: number | null;
  /** kg CO2e per kWh used for the estimate. */
  emissionFactor: number;
  note: string;
}

export interface ScoreHistoryPoint {
  date: string;
  score: number;
  /** `simulated` points are generated for demo buildings and must be labelled as such. */
  kind: 'simulated' | 'preliminary' | 'verified';
  label: string;
}

// ---------------------------------------------------------------------------
// Documents & verification
// ---------------------------------------------------------------------------

/** Named `BuildingDocument` to avoid clashing with the DOM `Document` global. */
export interface BuildingDocument {
  id: string;
  buildingId: string;
  uploadedBy?: string;
  category: DocumentCategory;
  documentType: DocumentType;
  /** Optional: the specific parameter this document is evidence for, e.g. "solarInstalled". */
  parameter?: string;
  fileName: string;
  fileUrl: string;
  mimeType: string;
  sizeBytes: number;
  verificationStatus: DocumentVerificationStatus;
  reviewedBy: string | null;
  reviewedAt: string | null;
  rejectionReason: string | null;
  createdAt: string;
}

export interface ParameterVerification {
  category: CategoryKey;
  parameter: string;
  status: ParameterVerificationStatus;
  note?: string;
  /** Value the admin confirmed, if it differs from what the owner submitted. */
  verifiedValue?: string | number | boolean;
  evidenceDocumentIds: string[];
}

/** An admin's review of a building. Snapshots the scores they were shown. */
export interface Verification {
  id: string;
  buildingId: string;
  assessmentId: string;
  adminId: string;
  /** UNDER_REVIEW while in progress, then VERIFIED or REJECTED. */
  status: VerificationStatus;
  parameterVerification: ParameterVerification[];
  preliminaryScore: PreliminaryScore | null;
  mlPredictedScore: MLPredictedScore | null;
  finalScore: ScoreResult | null;
  reason: string | null;
  createdAt: string;
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// Recommendations
// ---------------------------------------------------------------------------

export interface Recommendation {
  id: string;
  buildingId: string;
  assessmentId?: string;
  category: CategoryKey;
  /** Id from the improvements catalogue (@greenscore/shared). */
  improvementId?: string;
  icon?: string;
  title: string;
  description: string;
  priority: RecommendationPriority;
  potentialImpact: {
    /** Estimated points gained on the 100-point scale. */
    scoreGain: number;
    note?: string;
  };
  source: RecommendationSource;
  /** For source = ML / AI. */
  modelVersion?: string;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// ML
// ---------------------------------------------------------------------------

export interface FeatureImportance {
  feature: string;
  importance: number;
}

/** Advisory output of the ML service for one assessment. */
export interface MLPrediction {
  id: string;
  buildingId: string;
  assessmentId: string;
  predictedScore: number;
  modelVersion: string;
  predictionMetadata: Record<string, unknown>;
  featureImportance: FeatureImportance[];
  createdAt: string;
}

/** Prediction vs human-verified truth. Only created from a VERIFIED human decision. */
export interface MLFeedback {
  id: string;
  buildingId: string;
  predictionId: string;
  /** The human verification this ground truth came from. */
  verificationId: string;
  mlScore: number;
  humanVerifiedScore: number;
  absoluteError: number;
  modelVersion: string;
  createdAt: string;
}

export interface MLModelMetrics {
  mae?: number;
  rmse?: number;
  r2?: number;
}

export interface MLModel {
  id: string;
  version: string;
  algorithm: string;
  datasetSize: number;
  mae: number | null;
  rmse: number | null;
  r2: number | null;
  status: MLModelStatus;
  modelPath: string;
  approvedBy: string | null;
  approvedAt: string | null;
  createdAt: string;
}

export interface MLTrainingRun {
  id: string;
  modelVersion: string;
  datasetSize: number;
  startedAt: string | null;
  completedAt: string | null;
  metrics: MLModelMetrics;
  status: MLTrainingRunStatus;
  error: string | null;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Audit
// ---------------------------------------------------------------------------

export interface AuditLogEntry {
  id: string;
  entity: AuditEntity;
  entityId: string;
  action: AuditAction;
  previousValue: unknown;
  newValue: unknown;
  /** User id. `null` means the system acted (e.g. automatic preliminary scoring). */
  changedBy: string | null;
  reason: string | null;
  timestamp: string;
}
