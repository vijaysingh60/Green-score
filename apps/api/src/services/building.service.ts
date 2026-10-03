import type {
  AdminBuildingRow,
  AssessmentParameters,
  Building,
  BuildingDetail,
  BuildingDocument,
  MapBuilding,
  MLFeedback,
  MLFeedbackSummary,
  Recommendation,
  Score,
  ScoreHistoryPoint,
  SubmitBuildingInput,
  VerifyInput,
  VerifyResult,
  BuildingProfile,
  FinalScore,
} from '@greenscore/types';
import {
  ASSESSMENT_SCHEMA_VERSION,
  SCORING_CONFIG,
  buildRecommendations,
  calculatePreliminaryScore,
  estimateCarbon,
  getVerifiedTotal,
  scaleBreakdown,
  simulateScoreHistory,
} from '@greenscore/shared';
import {
  Building as BuildingModel,
  BuildingAssessment,
  DocumentModel,
  MLFeedback as MLFeedbackModel,
  MLPrediction,
  Recommendation as RecommendationModel,
  ScoreModel,
  Verification,
  toStoredParameters,
} from '../models';
import { ApiError } from '../utils/api-error';
import { parseObjectId } from '../utils/object-id';
import { recordAudit } from './audit.service';
import { predictScore } from './ml-client.service';

/** MVP: there are no admin accounts, so decisions are attributed to this label. */
const ADMIN_NAME = 'GREENScore Admin (demo)';

/** Mongoose documents already serialise to the wire shape (`_id` -> `id`, no secrets). */
const wire = <T>(doc: { toJSON: () => unknown }): T => doc.toJSON() as T;

// ---------------------------------------------------------------------------
// Public map
// ---------------------------------------------------------------------------

/** Buildings on the public map: ONLY status VERIFIED. Demo buildings are included but flagged. */
export async function listPublicBuildings(): Promise<MapBuilding[]> {
  const buildings = await BuildingModel.find({ status: 'VERIFIED' }).sort({ name: 1 });
  const scores = await ScoreModel.find({ buildingId: { $in: buildings.map((b) => b._id) } });
  const finalByBuilding = new Map(
    scores.map((s) => [String(s.buildingId), getVerifiedTotal(wire<Score>(s).finalVerifiedScore)]),
  );

  return buildings.map((b) => ({
    id: String(b._id),
    name: b.name,
    type: b.type,
    locality: b.locality,
    latitude: b.latitude,
    longitude: b.longitude,
    status: b.status,
    isDemo: b.isDemo,
    finalVerifiedScore: finalByBuilding.get(String(b._id)) ?? null,
  }));
}

// ---------------------------------------------------------------------------
// Building profile
// ---------------------------------------------------------------------------

export async function getProfile(idParam: string): Promise<BuildingProfile> {
  const id = parseObjectId(idParam, 'Building');
  const buildingDoc = await BuildingModel.findById(id);
  if (!buildingDoc) throw ApiError.notFound('Building not found');

  const [assessment, scoreDoc, recommendationDocs, documentDocs, feedbackDoc] = await Promise.all([
    BuildingAssessment.findOne({ buildingId: id }).sort({ version: -1 }),
    ScoreModel.findOne({ buildingId: id }),
    RecommendationModel.find({ buildingId: id }).sort({ 'potentialImpact.scoreGain': -1 }),
    DocumentModel.find({ buildingId: id }).sort({ createdAt: 1 }),
    MLFeedbackModel.findOne({ buildingId: id }).sort({ createdAt: -1 }),
  ]);

  const building = wire<Building>(buildingDoc);
  const score = scoreDoc ? wire<Score>(scoreDoc) : null;
  const parameters = assessment ? (wire<{ parameters: AssessmentParameters }>(assessment).parameters ?? null) : null;

  // Only an admin-approved decision on a VERIFIED building counts as the final score.
  const final = building.status === 'VERIFIED' ? score?.finalVerifiedScore ?? null : null;
  const verifiedTotal = getVerifiedTotal(final);

  const { owner: _owner, ...publicFields } = building;
  const detail: BuildingDetail = {
    ...publicFields,
    finalVerifiedScore: verifiedTotal,
    verifiedBreakdown: verifiedTotal !== null ? final?.breakdown ?? null : null,
    verifiedAt: verifiedTotal !== null ? final?.verifiedAt ?? null : null,
  };

  const context = { builtUpArea: building.builtUpArea, occupants: building.occupants };

  return {
    building: detail,
    parameters,
    score,
    recommendations: recommendationDocs.map((r) => wire<Recommendation>(r)),
    carbon: parameters ? estimateCarbon(parameters, context) : null,
    history: buildHistory(building, score, verifiedTotal),
    feedback: feedbackDoc ? wire<MLFeedback>(feedbackDoc) : null,
    documents: documentDocs.map((d) => wire<BuildingDocument>(d)),
  };
}

/** Demo buildings get a SIMULATED history; real buildings get only events that really happened. */
function buildHistory(building: Building, score: Score | null, verifiedTotal: number | null): ScoreHistoryPoint[] {
  const current = verifiedTotal ?? score?.preliminaryScore?.totalScore ?? null;
  if (building.isDemo) {
    return current === null ? [] : simulateScoreHistory(current, building.id);
  }
  const points: ScoreHistoryPoint[] = [];
  if (score?.preliminaryScore) {
    points.push({
      date: score.preliminaryScore.calculatedAt,
      score: score.preliminaryScore.totalScore,
      kind: 'preliminary',
      label: 'Preliminary score',
    });
  }
  if (verifiedTotal !== null && score?.finalVerifiedScore?.verifiedAt) {
    points.push({
      date: score.finalVerifiedScore.verifiedAt,
      score: verifiedTotal,
      kind: 'verified',
      label: 'Verified by admin',
    });
  }
  return points;
}

// ---------------------------------------------------------------------------
// Submit a building (building + assessment + preliminary + ML + recommendations)
// ---------------------------------------------------------------------------

export async function submitBuilding(input: SubmitBuildingInput): Promise<BuildingProfile> {
  const { building: fields, parameters, documents = [] } = input;

  const building = await BuildingModel.create({ ...fields, status: 'SUBMITTED', isDemo: false });
  const assessment = await BuildingAssessment.create({
    buildingId: building._id,
    version: 1,
    schemaVersion: ASSESSMENT_SCHEMA_VERSION,
    parameters: toStoredParameters(parameters),
  });

  const context = { builtUpArea: fields.builtUpArea, occupants: fields.occupants };

  // 1. Preliminary: deterministic, rule-based.
  const preliminary = calculatePreliminaryScore(parameters, context);
  const calculatedAt = new Date();

  // 2. ML: advisory, stored in its OWN slot and its own collection.
  const prediction = await predictScore(
    {
      buildingId: String(building._id),
      assessmentId: String(assessment._id),
      building: {
        type: fields.type,
        builtUpArea: fields.builtUpArea,
        occupants: fields.occupants,
        numberOfFloors: fields.numberOfFloors,
        yearConstructed: fields.yearConstructed,
      },
      parameters,
    },
    preliminary.totalScore,
  );
  const predictionDoc = await MLPrediction.create({
    buildingId: building._id,
    assessmentId: assessment._id,
    predictedScore: prediction.predictedScore,
    modelVersion: prediction.modelVersion,
    predictionMetadata: prediction.metadata,
    featureImportance: prediction.featureImportance,
  });

  const score = await ScoreModel.create({
    buildingId: building._id,
    assessmentId: assessment._id,
    preliminaryScore: { ...preliminary, calculatedAt },
    mlPredictedScore: {
      totalScore: prediction.predictedScore,
      modelVersion: prediction.modelVersion,
      predictionId: predictionDoc._id,
      predictedAt: new Date(),
    },
    // finalVerifiedScore stays null until an admin decides.
  });

  // 3. Rule-based recommendations from the weakest areas.
  const drafts = buildRecommendations(parameters, context);
  if (drafts.length > 0) {
    await RecommendationModel.insertMany(
      drafts.map((draft) => ({ ...draft, buildingId: building._id, assessmentId: assessment._id })),
    );
  }

  // 4. Mock documents (names only, nothing is uploaded in the MVP).
  if (documents.length > 0) {
    await DocumentModel.insertMany(
      documents.map((doc) => ({
        ...doc,
        buildingId: building._id,
        fileUrl: `mock://${encodeURIComponent(doc.fileName)}`,
      })),
    );
  }

  await recordAudit({
    entity: 'Score',
    entityId: score._id,
    action: 'SCORE_PRELIMINARY_CALCULATED',
    previousValue: null,
    newValue: { preliminaryTotal: preliminary.totalScore, mlTotal: prediction.predictedScore },
    reason: 'Building submitted',
  });

  return getProfile(String(building._id));
}

// ---------------------------------------------------------------------------
// Admin
// ---------------------------------------------------------------------------

const STATUS_ORDER: Record<string, number> = { SUBMITTED: 0, UNDER_REVIEW: 1, REJECTED: 2, VERIFIED: 3, DRAFT: 4 };

/** Everything except drafts, pending submissions first. */
export async function listAdminBuildings(): Promise<AdminBuildingRow[]> {
  const buildings = await BuildingModel.find({ status: { $ne: 'DRAFT' } }).sort({ createdAt: -1 });
  const ids = buildings.map((b) => b._id);
  const [scores, docCounts] = await Promise.all([
    ScoreModel.find({ buildingId: { $in: ids } }),
    DocumentModel.aggregate<{ _id: unknown; count: number }>([
      { $match: { buildingId: { $in: ids } } },
      { $group: { _id: '$buildingId', count: { $sum: 1 } } },
    ]),
  ]);
  const scoreByBuilding = new Map(scores.map((s) => [String(s.buildingId), wire<Score>(s)]));
  const docsByBuilding = new Map(docCounts.map((d) => [String(d._id), d.count]));

  return buildings
    .map((b): AdminBuildingRow => {
      const score = scoreByBuilding.get(String(b._id));
      return {
        building: wire<Building>(b),
        preliminaryTotal: score?.preliminaryScore?.totalScore ?? null,
        mlTotal: score?.mlPredictedScore?.totalScore ?? null,
        finalTotal: getVerifiedTotal(score?.finalVerifiedScore),
        documentCount: docsByBuilding.get(String(b._id)) ?? 0,
      };
    })
    .sort((a, b) => (STATUS_ORDER[a.building.status] ?? 9) - (STATUS_ORDER[b.building.status] ?? 9));
}

/** The admin's human decision. Only this function ever writes `finalVerifiedScore`. */
export async function verifyBuilding(idParam: string, input: VerifyInput): Promise<VerifyResult> {
  const id = parseObjectId(idParam, 'Building');
  const building = await BuildingModel.findById(id);
  if (!building) throw ApiError.notFound('Building not found');
  if (building.status === 'VERIFIED') throw ApiError.conflict('This building is already verified');
  if (building.status === 'DRAFT') throw ApiError.conflict('Draft buildings have not been submitted for review');

  const score = await ScoreModel.findOne({ buildingId: id });
  const preliminary = score?.preliminaryScore;
  if (!score || !preliminary || !score.assessmentId) {
    throw ApiError.conflict('This building has no preliminary score to review');
  }

  const methodologyVersion = SCORING_CONFIG.methodologyVersion;
  const previousFinal = score.finalVerifiedScore ? wire<Score>(score).finalVerifiedScore : null;
  const verifiedAt = new Date();
  const verifying = input.decision === 'VERIFY';

  const finalTotal = verifying ? Math.round((input.finalScore ?? preliminary.totalScore) * 10) / 10 : null;
  const adjusted = verifying && finalTotal !== preliminary.totalScore;
  const prelimBreakdown = wire<Score>(score).preliminaryScore!.breakdown;
  const finalBreakdown =
    finalTotal === null
      ? null
      : adjusted
        ? scaleBreakdown(prelimBreakdown, finalTotal)
        : prelimBreakdown;

  const verification = await Verification.create({
    buildingId: id,
    assessmentId: score.assessmentId,
    adminId: ADMIN_NAME,
    status: verifying ? 'VERIFIED' : 'REJECTED',
    preliminaryScore: score.preliminaryScore,
    mlPredictedScore: score.mlPredictedScore,
    finalScore: finalTotal !== null && finalBreakdown ? { totalScore: finalTotal, breakdown: finalBreakdown } : null,
    reason: input.reason ?? null,
  });

  score.finalVerifiedScore = {
    verificationStatus: verifying ? 'VERIFIED' : 'REJECTED',
    totalScore: finalTotal,
    breakdown: finalBreakdown,
    verifiedBy: ADMIN_NAME,
    verifiedAt,
    verificationReason: input.reason ?? null,
    verificationId: verification._id,
    methodologyVersion,
  } as typeof score.finalVerifiedScore;
  await score.save();

  building.status = verifying ? 'VERIFIED' : 'REJECTED';
  await building.save();

  await recordAudit({
    entity: 'Score',
    entityId: score._id,
    action: !verifying ? 'SCORE_REJECTED' : adjusted ? 'SCORE_OVERRIDDEN' : 'SCORE_VERIFIED',
    previousValue: previousFinal,
    newValue: { decision: input.decision, finalTotal, preliminaryTotal: preliminary.totalScore },
    changedBy: ADMIN_NAME,
    reason: input.reason ?? (adjusted ? `Adjusted from ${preliminary.totalScore} to ${finalTotal}` : null),
  });

  // ML feedback: prediction vs the HUMAN-verified score. Stored only, never auto-retrains.
  let feedback: MLFeedback | null = null;
  const ml = score.mlPredictedScore;
  if (verifying && finalTotal !== null && ml?.predictionId) {
    const feedbackDoc = await MLFeedbackModel.create({
      buildingId: id,
      predictionId: ml.predictionId,
      verificationId: verification._id,
      mlScore: ml.totalScore,
      humanVerifiedScore: finalTotal,
      modelVersion: ml.modelVersion,
    });
    feedback = wire<MLFeedback>(feedbackDoc);
  }

  return {
    status: building.status,
    finalVerifiedScore: wire<Score>(score).finalVerifiedScore as FinalScore,
    feedback,
  };
}

/** ML vs human, newest first. Powers the "ML feedback" table on the admin models page. */
export async function getFeedbackSummary(): Promise<MLFeedbackSummary> {
  const feedbackDocs = await MLFeedbackModel.find().sort({ createdAt: -1 }).limit(50);
  const buildings = await BuildingModel.find({ _id: { $in: feedbackDocs.map((f) => f.buildingId) } });
  const byId = new Map(buildings.map((b) => [String(b._id), b]));

  const rows = feedbackDocs.map((doc) => {
    const building = byId.get(String(doc.buildingId));
    return {
      ...wire<MLFeedback>(doc),
      buildingName: building?.name ?? 'Unknown building',
      isDemo: building?.isDemo ?? false,
    };
  });
  const mae = rows.length
    ? Math.round((rows.reduce((sum, row) => sum + row.absoluteError, 0) / rows.length) * 100) / 100
    : null;
  return { rows, mae, count: rows.length };
}
