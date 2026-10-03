import type {
  BuildingType,
  CategoryKey,
  ScoreKind,
  VerificationStatus,
} from '@greenscore/types';

/** Display names for the eight scored categories. */
export const CATEGORY_LABELS: Record<CategoryKey, string> = {
  energy: 'Energy',
  water: 'Water',
  waste: 'Waste',
  greenCover: 'Green Cover & Site',
  materials: 'Sustainable Materials',
  indoorEnvironment: 'Indoor Environment',
  mobility: 'Sustainable Mobility',
  climateResilience: 'Climate Resilience',
};

export const BUILDING_TYPE_LABELS: Record<BuildingType, string> = {
  RESIDENTIAL: 'Residential',
  OFFICE: 'Office',
  COMMERCIAL: 'Commercial',
  RETAIL: 'Retail',
  EDUCATIONAL: 'Educational',
  HEALTHCARE: 'Healthcare',
  HOSPITALITY: 'Hospitality',
  INDUSTRIAL: 'Industrial',
  MIXED_USE: 'Mixed use',
  OTHER: 'Other',
};

export const VERIFICATION_STATUS_LABELS: Record<VerificationStatus, string> = {
  DRAFT: 'Draft',
  SUBMITTED: 'Submitted',
  UNDER_REVIEW: 'Under review',
  VERIFIED: 'Verified',
  REJECTED: 'Rejected',
};

/**
 * Labels for the four score slots. The UI must use these so that an unverified
 * number is never presented as an official one: only `verified` reads
 * "Verified Green Score".
 */
export const SCORE_KIND_LABELS: Record<ScoreKind, { label: string; caption: string }> = {
  preliminary: {
    label: 'Preliminary Score',
    caption: 'Rule-based estimate from the submitted parameters',
  },
  mlPredicted: {
    label: 'ML Predicted Score',
    caption: 'Advisory only. Not an official score',
  },
  projected: {
    label: 'Projected Score',
    caption: 'What-if estimate for an improvement scenario',
  },
  verified: {
    label: 'Verified Green Score',
    caption: 'Approved by a GREENScore admin',
  },
};

/** Shown instead of "Verified Green Score" for seeded sample buildings. */
export const DEMO_SCORE_LABEL = {
  label: 'Sample score',
  caption: 'Demo data for development. Not a real verified assessment',
} as const;
