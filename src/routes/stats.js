import { Router } from 'express';
import { col, usersCol } from '../config/db.js';
import { authenticate } from '../middleware/auth.js';
import { asyncHandler } from '../utils/errors.js';

const router = Router();

const group = async (collection, match, field) =>
  (await col(collection).aggregate([{ $match: match }, { $group: { _id: `$${field}`, value: { $sum: 1 } } }, { $sort: { value: -1 } }]).toArray())
    .map((r) => ({ name: r._id, value: r.value }));

const monthly = async (match) =>
  (await col('payments').aggregate([
    { $match: match },
    { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$paidAt' } }, value: { $sum: '$amount' } } },
    { $sort: { _id: 1 } }, { $limit: 12 },
  ]).toArray()).map((r) => ({ name: r._id, value: Math.round(r.value * 100) / 100 }));

/** Public numbers for the landing page */
router.get('/public', asyncHandler(async (_req, res) => {
  const [technicians, customers, jobs, services] = await Promise.all([
    usersCol().countDocuments({ role: 'technician' }),
    usersCol().countDocuments({ role: 'customer' }),
    col('bookings').countDocuments({ status: 'completed' }),
    col('services').countDocuments({ approvalStatus: 'approved', isAvailable: true }),
  ]);
  res.json({ technicians, customers, jobs, services });
}));

/** Role-aware dashboard overview: stat cards + chart datasets */
router.get('/overview', authenticate, asyncHandler(async (req, res) => {
  const { role, email } = req.user;
  if (role === 'customer') {
    const m = { customerEmail: email };
    const [total, active, completed, spentAgg, byStatus] = await Promise.all([
      col('bookings').countDocuments(m),
      col('bookings').countDocuments({ ...m, status: { $in: ['requested', 'accepted', 'in-progress'] } }),
      col('bookings').countDocuments({ ...m, status: 'completed' }),
      col('payments').aggregate([{ $match: m }, { $group: { _id: null, t: { $sum: '$amount' } } }]).toArray(),
      group('bookings', m, 'status'),
    ]);
    return res.json({ cards: { total, active, completed, spent: spentAgg[0]?.t || 0 }, charts: { byStatus, spending: await monthly(m) } });
  }
  if (role === 'technician') {
    const m = { technicianEmail: email };
    const [totalServices, approved, pending, earnAgg, byStatus] = await Promise.all([
      col('services').countDocuments(m),
      col('services').countDocuments({ ...m, approvalStatus: 'approved' }),
      col('bookings').countDocuments({ ...m, status: 'requested' }),
      col('payments').aggregate([{ $match: m }, { $group: { _id: null, t: { $sum: '$amount' } } }]).toArray(),
      group('bookings', m, 'status'),
    ]);
    return res.json({ cards: { totalServices, approved, pending, earnings: earnAgg[0]?.t || 0 }, charts: { byStatus, earnings: await monthly(m) } });
  }
  const [users, technicians, pending, revenueAgg, byStatus, byCategory, usersByRole] = await Promise.all([
    usersCol().countDocuments({}),
    usersCol().countDocuments({ role: 'technician' }),
    col('services').countDocuments({ approvalStatus: 'pending' }),
    col('payments').aggregate([{ $group: { _id: null, t: { $sum: '$amount' } } }]).toArray(),
    group('bookings', {}, 'status'),
    group('services', {}, 'category'),
    (await usersCol().aggregate([{ $group: { _id: '$role', value: { $sum: 1 } } }]).toArray()).map((r) => ({ name: r._id || 'customer', value: r.value })),
  ]);
  res.json({ cards: { users, technicians, pending, revenue: revenueAgg[0]?.t || 0 }, charts: { byStatus, byCategory, usersByRole, revenue: await monthly({}) } });
}));

export default router;
