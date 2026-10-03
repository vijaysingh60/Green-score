import { Router } from 'express';
import type { HealthStatus } from '@greenscore/types';
import { getDatabaseState } from '../config/database';
import { requireAdmin } from '../middleware/admin';
import { parseSubmitBuilding, parseVerify } from '../validators/building.validators';
import {
  getFeedbackSummary,
  getProfile,
  listAdminBuildings,
  listPublicBuildings,
  submitBuilding,
  verifyBuilding,
} from '../services/building.service';
import { getMlServiceStatus } from '../services/ml-client.service';
import { sendData } from '../utils/response';

/**
 * REST routes (mounted at /api). Handlers stay thin: validate -> call a service -> send.
 * See docs/api-contract.md.
 */
const api = Router();

// --- Public ------------------------------------------------------------------

api.get('/health', (_req, res) => {
  const database = getDatabaseState();
  const body: HealthStatus = {
    status: database === 'connected' ? 'ok' : 'degraded',
    service: 'greenscore-api',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.round(process.uptime()),
    database,
  };
  res.status(database === 'connected' ? 200 : 503).json({ data: body });
});

/** Map markers: only buildings with status VERIFIED (demo buildings are included and flagged). */
api.get('/buildings', async (_req, res) => {
  const buildings = await listPublicBuildings();
  sendData(res, buildings, { meta: { count: buildings.length } });
});

api.get('/buildings/:id', async (req, res) => {
  sendData(res, await getProfile(req.params.id));
});

/** One call: building + assessment -> preliminary score, ML prediction, recommendations. */
api.post('/buildings', async (req, res) => {
  const profile = await submitBuilding(parseSubmitBuilding(req.body));
  sendData(res, profile, { status: 201 });
});

// --- Admin (demo passcode) ---------------------------------------------------

const admin = Router();
admin.use(requireAdmin);

admin.get('/ping', (_req, res) => sendData(res, { ok: true }));

admin.get('/buildings', async (_req, res) => {
  const rows = await listAdminBuildings();
  sendData(res, rows, { meta: { count: rows.length } });
});

admin.get('/buildings/:id', async (req, res) => {
  sendData(res, await getProfile(req.params.id));
});

admin.post('/buildings/:id/verify', async (req, res) => {
  sendData(res, await verifyBuilding(req.params.id, parseVerify(req.body)));
});

admin.get('/ml-feedback', async (_req, res) => {
  sendData(res, await getFeedbackSummary());
});

admin.get('/ml-status', async (_req, res) => {
  sendData(res, await getMlServiceStatus());
});

api.use('/admin', admin);

export { api as apiRouter };
