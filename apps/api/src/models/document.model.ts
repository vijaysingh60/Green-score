import { model, Schema, type HydratedDocument, type InferSchemaType } from 'mongoose';
import {
  DOCUMENT_CATEGORIES,
  DOCUMENT_TYPES,
  DOCUMENT_VERIFICATION_STATUSES,
} from '@greenscore/types';
import { baseSchemaOptions } from './_shared';

/**
 * Evidence uploaded for a building (bills, photos, certificates ...).
 * The file itself lives behind the StorageProvider abstraction (services/storage), so this
 * record only stores where to find it: `storageProvider` + `storageKey` (+ a resolvable `fileUrl`).
 */
const documentSchema = new Schema(
  {
    buildingId: { type: Schema.Types.ObjectId, ref: 'Building', required: true },
    uploadedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    category: { type: String, enum: DOCUMENT_CATEGORIES, required: true },
    documentType: { type: String, enum: DOCUMENT_TYPES, required: true },
    /** Optional: the specific parameter this is evidence for, e.g. "solarInstalled". */
    parameter: { type: String, maxlength: 80 },
    fileName: { type: String, required: true, trim: true, maxlength: 255 },
    /** MVP: documents are MOCK records (name only, nothing is uploaded) and use `mock://`. */
    fileUrl: { type: String, required: true },
    storageProvider: { type: String, required: true, default: 'mock' },
    storageKey: { type: String },
    mimeType: { type: String, required: true, default: 'application/pdf' },
    sizeBytes: { type: Number, required: true, min: 0, default: 0 },
    verificationStatus: {
      type: String,
      enum: DOCUMENT_VERIFICATION_STATUSES,
      required: true,
      default: 'PENDING',
    },
    reviewedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    reviewedAt: { type: Date, default: null },
    rejectionReason: { type: String, maxlength: 1000, default: null },
  },
  baseSchemaOptions,
);

documentSchema.index({ buildingId: 1 }); //          a building's evidence
documentSchema.index({ verificationStatus: 1 }); //  admin review queue

export type DocumentRecord = HydratedDocument<InferSchemaType<typeof documentSchema>>;
export const DocumentModel = model('Document', documentSchema);
