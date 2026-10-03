import type { Types } from 'mongoose';
import type { AuditAction, AuditEntity } from '@greenscore/types';
import { AuditLog } from '../models';

export interface AuditInput {
  entity: AuditEntity;
  entityId: Types.ObjectId | string;
  action: AuditAction;
  previousValue?: unknown;
  newValue?: unknown;
  /** Admin name, or null/undefined when the system acted. */
  changedBy?: string | null;
  reason?: string | null;
}

/** Round-trip through JSON so only plain data (ISO dates, string ids) is stored. */
const toPlain = (value: unknown): unknown =>
  value === undefined ? null : JSON.parse(JSON.stringify(value));

/** Every score change goes through here. Audit entries are append-only (see the AuditLog model). */
export async function recordAudit(input: AuditInput): Promise<void> {
  await AuditLog.create({
    entity: input.entity,
    entityId: input.entityId,
    action: input.action,
    previousValue: toPlain(input.previousValue),
    newValue: toPlain(input.newValue),
    changedBy: input.changedBy ?? null,
    reason: input.reason ?? null,
  });
}
