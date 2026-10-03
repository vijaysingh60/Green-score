import { Schema, type SchemaDefinitionProperty } from 'mongoose';
import { CATEGORY_KEYS, QUALITY_LEVELS, type AssessmentParameters } from '@greenscore/types';
import { getParameterDefinitions, type ParameterDefinition } from '@greenscore/shared';

/**
 * The embedded `parameters` sub-document of a BuildingAssessment.
 *
 * It is GENERATED from the parameter registry in `@greenscore/shared`, so the stored shape,
 * the zod validator and the scoring engine can never drift apart. To add a parameter, edit the
 * registry (see packages/types/src/parameters.ts), not this file.
 *
 * Every field is optional: partially filled assessments are valid.
 */

function fieldFor(definition: ParameterDefinition): SchemaDefinitionProperty {
  switch (definition.kind) {
    case 'boolean':
      return { type: Boolean };
    case 'percent':
      return { type: Number, min: 0, max: 100 };
    case 'number':
      return { type: Number, min: 0 };
    case 'level':
      return { type: String, enum: QUALITY_LEVELS };
  }
}

function categorySchema(category: (typeof CATEGORY_KEYS)[number]): Schema {
  const fields = Object.fromEntries(
    Object.entries(getParameterDefinitions(category)).map(([key, definition]) => [
      key,
      fieldFor(definition),
    ]),
  );
  return new Schema(fields, { _id: false });
}

/**
 * Mongoose infers a loose index-signature type for the generated schema, which our precise
 * `AssessmentParameters` interface is not assignable to. Use this at write sites.
 */
export const toStoredParameters = (parameters: AssessmentParameters): Record<string, Record<string, unknown>> =>
  parameters as unknown as Record<string, Record<string, unknown>>;

export const assessmentParametersSchema = new Schema(
  Object.fromEntries(CATEGORY_KEYS.map((category) => [category, categorySchema(category)])),
  { _id: false, minimize: false },
);
