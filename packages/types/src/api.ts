import type {
  ApiErrorCode,
  DocumentCategory,
  DocumentType,
  VerificationStatus,
} from './enums';
import type { AssessmentParameters } from './parameters';
import type {
  Building,
  BuildingDetail,
  BuildingDocument,
  FinalScore,
  MLFeedback,
  Recommendation,
  Score,
  ScoreHistoryPoint,
  CarbonEstimate,
} from './models';
import type { BuildingType } from './enums';

/** Success envelope: every 2xx JSON response is `{ data, meta? }`. */
export interface ApiSuccess<T, M = Record<string, unknown>> {
  data: T;
  meta?: M;
}

/** Error envelope: every non-2xx JSON response is `{ error }`. */
export interface ApiErrorBody {
  error: {
    code: ApiErrorCode;
    message: string;
    /** Field errors for VALIDATION_ERROR. */
    details?: unknown;
  };
}

export interface ListMeta {
  count: number;
}

// --- Submitting a building -------------------------------------------------

export interface CreateBuildingInput {
  name: string;
  type: BuildingType;
  address: string;
  locality: string;
  /** Defaults to "Hyderabad". */
  city?: string;
  pincode: string;
  latitude: number;
  longitude: number;
  yearConstructed: number;
  numberOfFloors: number;
  /** Square metres. */
  builtUpArea: number;
  occupants: number;
}

/** MVP: documents are mock records (a name only), nothing is uploaded. */
export interface MockDocumentInput {
  fileName: string;
  documentType: DocumentType;
  category: DocumentCategory;
}

/** `POST /api/buildings`: one call creates the building, its assessment, scores and recommendations. */
export interface SubmitBuildingInput {
  building: CreateBuildingInput;
  parameters: AssessmentParameters;
  documents?: MockDocumentInput[];
}

// --- Building profile (public, also used by admin review) -------------------

export interface BuildingProfile {
  building: BuildingDetail;
  /** The submitted parameters, so the profile can run the what-if simulator. */
  parameters: AssessmentParameters | null;
  /** All four score slots. Only `finalVerifiedScore` is official, and only when VERIFIED. */
  score: Score | null;
  recommendations: Recommendation[];
  carbon: CarbonEstimate | null;
  history: ScoreHistoryPoint[];
  /** ML prediction vs the human-verified score, once an admin has verified the building. */
  feedback: MLFeedback | null;
  documents: BuildingDocument[];
}

// --- Admin -------------------------------------------------------------------

export interface AdminBuildingRow {
  building: Building;
  preliminaryTotal: number | null;
  mlTotal: number | null;
  finalTotal: number | null;
  documentCount: number;
}

export interface VerifyInput {
  decision: 'VERIFY' | 'REJECT';
  /** Final total (0-100). Defaults to the preliminary score. The admin may adjust it. */
  finalScore?: number;
  reason?: string;
}

export interface VerifyResult {
  status: VerificationStatus;
  finalVerifiedScore: FinalScore;
  feedback: MLFeedback | null;
}

export interface MLFeedbackSummary {
  rows: Array<MLFeedback & { buildingName: string; isDemo: boolean }>;
  /** Mean absolute error across the rows. */
  mae: number | null;
  count: number;
}

export interface HealthStatus {
  status: 'ok' | 'degraded';
  service: 'greenscore-api';
  timestamp: string;
  uptimeSeconds: number;
  database: 'connected' | 'connecting' | 'disconnecting' | 'disconnected';
}
