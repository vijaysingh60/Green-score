import type {
  AdminBuildingRow,
  ApiErrorBody,
  ApiSuccess,
  BuildingProfile,
  MapBuilding,
  MLFeedbackSummary,
  MLServiceModelStatus,
  SubmitBuildingInput,
  VerifyInput,
  VerifyResult,
} from '@greenscore/types';
import { getDemoMapBuildings } from '@greenscore/shared';

export const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000').replace(/\/$/, '');

export class ApiRequestError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = 'ApiRequestError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

interface RequestOptions extends Omit<RequestInit, 'headers'> {
  adminPasscode?: string;
}

async function request<T>(path: string, { adminPasscode, ...init }: RequestOptions = {}): Promise<T> {
  const headers = new Headers({ 'content-type': 'application/json' });
  if (adminPasscode) headers.set('x-admin-passcode', adminPasscode);

  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, { ...init, headers, cache: 'no-store' });
  } catch {
    throw new ApiRequestError(0, 'NETWORK', `Cannot reach the GREENScore API at ${API_URL}. Is it running?`);
  }

  const body = (await response.json().catch(() => null)) as ApiSuccess<T> | ApiErrorBody | null;
  if (!response.ok) {
    const error = body && 'error' in body ? body.error : undefined;
    throw new ApiRequestError(
      response.status,
      error?.code ?? 'ERROR',
      error?.message ?? response.statusText,
      error?.details,
    );
  }
  return (body as ApiSuccess<T>).data;
}

export const api = {
  building: (id: string) => request<BuildingProfile>(`/api/buildings/${encodeURIComponent(id)}`),
  submitBuilding: (input: SubmitBuildingInput) =>
    request<BuildingProfile>('/api/buildings', { method: 'POST', body: JSON.stringify(input) }),

  admin: {
    ping: (passcode: string) => request<{ ok: true }>('/api/admin/ping', { adminPasscode: passcode }),
    buildings: (passcode: string) => request<AdminBuildingRow[]>('/api/admin/buildings', { adminPasscode: passcode }),
    building: (passcode: string, id: string) =>
      request<BuildingProfile>(`/api/admin/buildings/${encodeURIComponent(id)}`, { adminPasscode: passcode }),
    verify: (passcode: string, id: string, input: VerifyInput) =>
      request<VerifyResult>(`/api/admin/buildings/${encodeURIComponent(id)}/verify`, {
        method: 'POST',
        body: JSON.stringify(input),
        adminPasscode: passcode,
      }),
    mlFeedback: (passcode: string) => request<MLFeedbackSummary>('/api/admin/ml-feedback', { adminPasscode: passcode }),
    mlStatus: (passcode: string) =>
      request<{ reachable: true; model: MLServiceModelStatus } | { reachable: false; error: string }>(
        '/api/admin/ml-status',
        { adminPasscode: passcode },
      ),
  },
};

/**
 * Map markers for the homepage. If the API is unreachable we fall back to the bundled DEMO
 * dataset so the page still works, and report where the data came from.
 */
export async function getMapBuildings(): Promise<{ buildings: MapBuilding[]; source: 'api' | 'demo-fallback' }> {
  try {
    const buildings = await request<MapBuilding[]>('/api/buildings', { signal: AbortSignal.timeout(3000) });
    return { buildings, source: 'api' };
  } catch {
    return { buildings: getDemoMapBuildings(), source: 'demo-fallback' };
  }
}
