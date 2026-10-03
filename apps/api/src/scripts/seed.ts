import {
  DEMO_DATA_NOTICE,
  SCORING_CONFIG,
  buildDemoDataset,
  buildRecommendations,
  simulateMlScore,
} from '@greenscore/shared';
import type { DocumentCategory, DocumentType } from '@greenscore/types';
import { connectDatabase, disconnectDatabase, ensureIndexes } from '../config/database';
import { getEnv } from '../config/env';
import {
  Building,
  BuildingAssessment,
  DocumentModel,
  MLFeedback,
  MLPrediction,
  Recommendation,
  ScoreModel,
  Verification,
  toStoredParameters,
} from '../models';
import { logger } from '../utils/logger';

/**
 * Seeds DEMO Hyderabad buildings (see packages/shared/src/demo/demo-buildings.ts).
 * Every record is flagged `isDemo: true`; none is a real verified assessment.
 * Re-running replaces the previous demo data and leaves real submissions untouched.
 */

const DEMO_MODEL_VERSION = 'demo-simulated';

async function main(): Promise<void> {
  const env = getEnv();
  if (env.NODE_ENV === 'production') throw new Error('Refusing to seed demo data when NODE_ENV=production');

  await connectDatabase(env.MONGODB_URI);
  await ensureIndexes();

  // Remove previous demo data (and only demo data).
  const oldIds = (await Building.find({ isDemo: true }, '_id')).map((b) => b._id);
  if (oldIds.length > 0) {
    const byBuilding = { buildingId: { $in: oldIds } };
    await Promise.all([
      BuildingAssessment.deleteMany(byBuilding),
      ScoreModel.deleteMany(byBuilding),
      Recommendation.deleteMany(byBuilding),
      DocumentModel.deleteMany(byBuilding),
      MLPrediction.deleteMany(byBuilding),
      MLFeedback.deleteMany(byBuilding),
      Verification.deleteMany(byBuilding),
    ]);
    await Building.deleteMany({ _id: { $in: oldIds } });
  }

  let verified = 0;
  let pending = 0;

  for (const record of buildDemoDataset()) {
    const { building: fields, parameters, preliminary, sampleFinal } = record;
    const context = { builtUpArea: fields.builtUpArea, occupants: fields.occupants };

    const building = await Building.create({ ...fields, isDemo: true });
    const assessment = await BuildingAssessment.create({
      buildingId: building._id,
      version: 1,
      schemaVersion: '1.0.0',
      parameters: toStoredParameters(parameters),
    });

    const mlTotal = simulateMlScore(preliminary.totalScore, record.key);
    const prediction = await MLPrediction.create({
      buildingId: building._id,
      assessmentId: assessment._id,
      predictedScore: mlTotal,
      modelVersion: DEMO_MODEL_VERSION,
      predictionMetadata: { simulated: true, note: DEMO_DATA_NOTICE },
    });

    const preliminaryScore = { ...preliminary, calculatedAt: new Date() };
    const mlPredictedScore = {
      totalScore: mlTotal,
      modelVersion: DEMO_MODEL_VERSION,
      predictionId: prediction._id,
      predictedAt: new Date(),
    };

    let finalVerifiedScore = null;
    if (sampleFinal) {
      const verification = await Verification.create({
        buildingId: building._id,
        assessmentId: assessment._id,
        adminId: 'Demo data',
        status: 'VERIFIED',
        preliminaryScore,
        mlPredictedScore,
        finalScore: sampleFinal,
        reason: DEMO_DATA_NOTICE,
      });
      // Sample "admin decision" for demo buildings only: clearly flagged, no real verifier.
      finalVerifiedScore = {
        verificationStatus: 'VERIFIED' as const,
        totalScore: sampleFinal.totalScore,
        breakdown: sampleFinal.breakdown,
        verifiedBy: 'Demo data',
        verifiedAt: null,
        verificationReason: DEMO_DATA_NOTICE,
        verificationId: verification._id,
        methodologyVersion: SCORING_CONFIG.methodologyVersion,
      };
      await MLFeedback.create({
        buildingId: building._id,
        predictionId: prediction._id,
        verificationId: verification._id,
        mlScore: mlTotal,
        humanVerifiedScore: sampleFinal.totalScore,
        modelVersion: DEMO_MODEL_VERSION,
      });
      verified += 1;
    } else {
      pending += 1;
    }

    await ScoreModel.create({
      buildingId: building._id,
      assessmentId: assessment._id,
      preliminaryScore,
      mlPredictedScore,
      finalVerifiedScore,
      isDemo: true,
    });

    const drafts = buildRecommendations(parameters, context);
    if (drafts.length > 0) {
      await Recommendation.insertMany(
        drafts.map((draft) => ({ ...draft, buildingId: building._id, assessmentId: assessment._id })),
      );
    }

    const docs: Array<[string, DocumentType, DocumentCategory]> = [
      ['Electricity bills FY25 (sample).pdf', 'ELECTRICITY_BILL', 'energy'],
      ['Site photographs (sample).pdf', 'SITE_PHOTO', 'general'],
    ];
    if (parameters.energy?.solarInstalled) {
      docs.push(['Solar installation proof (sample).pdf', 'SOLAR_INSTALLATION_PROOF', 'energy']);
    }
    if (parameters.water?.rainwaterHarvesting) {
      docs.push(['Rainwater harvesting layout (sample).pdf', 'RAINWATER_HARVESTING_PROOF', 'water']);
    }
    await DocumentModel.insertMany(
      docs.map(([fileName, documentType, category]) => ({
        buildingId: building._id,
        fileName,
        documentType,
        category,
        fileUrl: `mock://${encodeURIComponent(fileName)}`,
        verificationStatus: sampleFinal ? 'VERIFIED' : 'PENDING',
      })),
    );
  }

  logger.info(
    `Seeded demo data: ${verified} verified-status + ${pending} pending demo buildings. ` +
      'All are flagged isDemo: true.',
  );
  await disconnectDatabase();
}

main().catch(async (error) => {
  logger.error(error instanceof Error ? error.message : 'Seed failed', error);
  await disconnectDatabase().catch(() => undefined);
  process.exit(1);
});
