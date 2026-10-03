import { model, Schema, type HydratedDocument, type InferSchemaType } from 'mongoose';
import { BUILDING_TYPES, VERIFICATION_STATUSES } from '@greenscore/types';
import { baseSchemaOptions } from './_shared';

/** GeoJSON Point, derived from latitude/longitude. Powers geo queries (2dsphere index). */
const pointSchema = new Schema(
  {
    type: { type: String, enum: ['Point'], required: true, default: 'Point' },
    /** [longitude, latitude]: GeoJSON order. */
    coordinates: { type: [Number], required: true },
  },
  { _id: false },
);

const buildingSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    type: { type: String, enum: BUILDING_TYPES, required: true },
    address: { type: String, required: true, trim: true, maxlength: 300 },
    locality: { type: String, required: true, trim: true, maxlength: 80 },
    city: { type: String, required: true, trim: true, maxlength: 60, default: 'Hyderabad' },
    pincode: { type: String, required: true, match: /^[1-9]\d{5}$/ },
    latitude: { type: Number, required: true, min: -90, max: 90 },
    longitude: { type: Number, required: true, min: -180, max: 180 },
    /** Derived in the `validate` hook below. Hidden from queries and JSON by default. */
    location: { type: pointSchema, select: false },
    yearConstructed: { type: Number, required: true, min: 1800 },
    numberOfFloors: { type: Number, required: true, min: 1 },
    /** Square metres. */
    builtUpArea: { type: Number, required: true, min: 1 },
    occupants: { type: Number, required: true, min: 0 },
    /** Optional in the MVP: there are no submitter accounts yet. */
    owner: { type: Schema.Types.ObjectId, ref: 'User' },
    status: { type: String, enum: VERIFICATION_STATUSES, required: true, default: 'DRAFT' },
    /** Sample data. Demo buildings must never be presented as real verified buildings. */
    isDemo: { type: Boolean, required: true, default: false },
  },
  baseSchemaOptions,
);

// Keep `location` in sync with latitude/longitude. NOTE: query-based updates
// (`findOneAndUpdate`) bypass this hook, so change coordinates via `doc.save()`.
buildingSchema.pre('validate', function () {
  const building = this as BuildingDoc; // Mongoose 9 types `this` as unknown here
  if (typeof building.latitude === 'number' && typeof building.longitude === 'number') {
    building.location = { type: 'Point', coordinates: [building.longitude, building.latitude] };
  }
});

// Indexes (kept deliberately small, each backs a real query):
buildingSchema.index({ location: '2dsphere' }); //          map bounds / nearby buildings
buildingSchema.index({ owner: 1, createdAt: -1 }); //        "my buildings"
buildingSchema.index({ status: 1, city: 1, locality: 1 }); // public list + admin queue + locality filters
buildingSchema.index({ city: 1, locality: 1 }); //            locality-wise statistics

export type BuildingDoc = HydratedDocument<InferSchemaType<typeof buildingSchema>>;
export const Building = model('Building', buildingSchema);
