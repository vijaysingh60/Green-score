import { z } from 'zod';
import {
  BUILDING_TYPES,
  CATEGORY_KEYS,
  DOCUMENT_CATEGORIES,
  DOCUMENT_TYPES,
  QUALITY_LEVELS,
  type SubmitBuildingInput,
  type VerifyInput,
} from '@greenscore/types';
import { getParameterDefinitions, isWithinHyderabad, type ParameterDefinition } from '@greenscore/shared';

/**
 * Request validation (zod). The assessment-parameter schema is GENERATED from the parameter
 * registry in @greenscore/shared, so it can never drift from the scoring engine or the database.
 */

function fieldSchema(definition: ParameterDefinition): z.ZodType {
  switch (definition.kind) {
    case 'boolean':
      return z.boolean();
    case 'percent':
      return z.number().min(0).max(100);
    case 'number':
      return z.number().min(0).max(1_000_000_000);
    case 'level':
      return z.enum(QUALITY_LEVELS);
  }
}

const categorySchema = (category: (typeof CATEGORY_KEYS)[number]) =>
  z.strictObject(
    Object.fromEntries(
      Object.entries(getParameterDefinitions(category)).map(([key, definition]) => [
        key,
        fieldSchema(definition).optional(),
      ]),
    ),
  );

const parametersSchema = z.strictObject(
  Object.fromEntries(CATEGORY_KEYS.map((category) => [category, categorySchema(category).optional()])),
);

const buildingSchema = z
  .strictObject({
    name: z.string().trim().min(2).max(120),
    type: z.enum(BUILDING_TYPES),
    address: z.string().trim().min(3).max(300),
    locality: z.string().trim().min(2).max(80),
    city: z.string().trim().min(2).max(60).default('Hyderabad'),
    pincode: z.string().regex(/^[1-9]\d{5}$/, 'must be a 6-digit pincode'),
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
    yearConstructed: z.number().int().min(1800).max(new Date().getFullYear() + 5),
    numberOfFloors: z.number().int().min(1).max(200),
    builtUpArea: z.number().positive().max(10_000_000),
    occupants: z.number().int().min(0).max(1_000_000),
  })
  .refine((b) => isWithinHyderabad(b.latitude, b.longitude), {
    path: ['latitude'],
    message: 'Location must be inside the Hyderabad region',
  });

export const submitBuildingSchema = z.strictObject({
  building: buildingSchema,
  parameters: parametersSchema,
  documents: z
    .array(
      z.strictObject({
        fileName: z.string().trim().min(1).max(255),
        documentType: z.enum(DOCUMENT_TYPES),
        category: z.enum(DOCUMENT_CATEGORIES),
      }),
    )
    .max(20)
    .optional(),
});

export const verifySchema = z.strictObject({
  decision: z.enum(['VERIFY', 'REJECT']),
  finalScore: z.number().min(0).max(100).optional(),
  reason: z.string().trim().max(2000).optional(),
});

/** The generated parameter schema is loosely typed, so narrow the parsed result explicitly. */
export const parseSubmitBuilding = (body: unknown): SubmitBuildingInput =>
  submitBuildingSchema.parse(body) as SubmitBuildingInput;

export const parseVerify = (body: unknown): VerifyInput => verifySchema.parse(body);
