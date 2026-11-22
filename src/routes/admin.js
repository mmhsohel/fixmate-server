import { Router } from 'express';
import { z } from 'zod';
import { ObjectId } from 'mongodb';
import { col, toObjectId, usersCol } from '../config/db.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { HttpError, asyncHandler } from '../utils/errors.js';
import { ROLES } from '../utils/constants.js';

const router = Router();
router.use(authenticate, requireRole('admin'));

router.get('/users', asyncHandler(async (_req, res) => {
  const items = await usersCol().find({}, { projection: { name: 1, email: 1, image: 1, role: 1, createdAt: 1, phone: 1, area: 1 } })
    .sort({ createdAt: -1 }).toArray();
  res.json({ items });
}));

router.patch('/users/:id/role', validate(z.object({ role: z.enum(ROLES) })), asyncHandler(async (req, res) => {
  if (req.params.id === req.user.id) throw new HttpError(403, 'You cannot change your own role');
  const filter = ObjectId.isValid(req.params.id) ? { _id: new ObjectId(req.params.id) } : { id: req.params.id };
  const r = await usersCol().updateOne(filter, { $set: { role: req.body.role, updatedAt: new Date() } });
  if (!r.matchedCount) throw new HttpError(404, 'User not found');
  res.json({ success: true });
}));

router.get('/services', asyncHandler(async (req, res) => {
  const filter = ['pending', 'approved', 'rejected'].includes(req.query.status) ? { approvalStatus: req.query.status } : {};
  const items = await col('services').find(filter).sort({ createdAt: -1 }).toArray();
  res.json({ items });
}));

router.patch('/services/:id/status', validate(z.object({ approvalStatus: z.enum(['approved', 'rejected']) })), asyncHandler(async (req, res) => {
  const _id = toObjectId(req.params.id);
  const r = _id && (await col('services').updateOne({ _id }, { $set: { approvalStatus: req.body.approvalStatus, reviewedAt: new Date() } }));
  if (!r?.matchedCount) throw new HttpError(404, 'Service not found');
  res.json({ success: true });
}));

router.get('/bookings', asyncHandler(async (req, res) => {
  const filter = req.query.status ? { status: String(req.query.status) } : {};
  res.json({ items: await col('bookings').find(filter).sort({ createdAt: -1 }).toArray() });
}));

router.get('/transactions', asyncHandler(async (_req, res) => {
  const items = await col('payments').find({}).sort({ paidAt: -1 }).toArray();
  res.json({ items, totalRevenue: items.reduce((s, p) => s + (p.amount || 0), 0) });
}));

export default router;
