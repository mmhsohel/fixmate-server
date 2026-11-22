import { Router } from 'express';
import { z } from 'zod';
import { col, toObjectId } from '../config/db.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { HttpError, asyncHandler } from '../utils/errors.js';
import { ACTIVE_BOOKING } from '../utils/constants.js';

const router = Router();
router.use(authenticate);

const createSchema = z.object({
  serviceId: z.string().min(1),
  customerPhone: z.string().trim().regex(/^[+\d][\d\s-]{6,18}$/, 'Enter a valid phone number'),
  address: z.string().trim().min(5, 'Address is too short').max(300),
  preferredDate: z.coerce.date({ invalid_type_error: 'Select a valid date' }).refine(
    (d) => d.getTime() >= Date.now() - 24 * 3600 * 1000, 'Preferred date must be today or later'),
  problemDescription: z.string().trim().min(20, 'Describe the problem in at least 20 characters').max(1500),
});

router.post('/', requireRole('customer'), validate(createSchema), asyncHandler(async (req, res) => {
  const _id = toObjectId(req.body.serviceId);
  const service = _id && (await col('services').findOne({ _id, approvalStatus: 'approved', isAvailable: true }));
  if (!service) throw new HttpError(404, 'This service is not available');
  if (service.technicianEmail === req.user.email) throw new HttpError(403, 'You cannot request your own service');

  const duplicate = await col('bookings').findOne({
    serviceId: String(_id), customerEmail: req.user.email, status: { $in: ACTIVE_BOOKING },
  });
  if (duplicate) throw new HttpError(409, 'You already have an active request for this service');

  const doc = {
    serviceId: String(_id),
    serviceTitle: service.title,
    serviceImage: service.image,
    category: service.category,
    basePrice: service.basePrice,
    technicianName: service.technicianName,
    technicianEmail: service.technicianEmail,
    customerName: req.user.name,
    customerEmail: req.user.email,
    customerPhone: req.body.customerPhone,
    address: req.body.address,
    preferredDate: req.body.preferredDate,
    problemDescription: req.body.problemDescription,
    status: 'requested',
    finalAmount: service.basePrice,
    paymentStatus: 'unpaid',
    createdAt: new Date(),
  };
  const { insertedId } = await col('bookings').insertOne(doc);
  res.status(201).json({ ...doc, _id: insertedId });
}));

router.get('/mine', requireRole('customer'), asyncHandler(async (req, res) => {
  const items = await col('bookings').find({ customerEmail: req.user.email }).sort({ createdAt: -1 }).toArray();
  res.json({ items });
}));

router.get('/technician', requireRole('technician'), asyncHandler(async (req, res) => {
  const filter = { technicianEmail: req.user.email };
  if (req.query.status) filter.status = String(req.query.status);
  const items = await col('bookings').find(filter).sort({ createdAt: -1 }).toArray();
  res.json({ items });
}));

// current status -> next status -> who may do it
const TRANSITIONS = {
  requested: { accepted: 'technician', rejected: 'technician', cancelled: 'customer' },
  accepted: { 'in-progress': 'technician' },
  'in-progress': { completed: 'technician' },
};

const statusSchema = z.object({
  status: z.enum(['accepted', 'rejected', 'in-progress', 'completed', 'cancelled']),
  finalAmount: z.coerce.number().optional(),
});

router.patch('/:id/status', validate(statusSchema), asyncHandler(async (req, res) => {
  const _id = toObjectId(req.params.id);
  const booking = _id && (await col('bookings').findOne({ _id }));
  if (!booking) throw new HttpError(404, 'Booking not found');

  const { status: next, finalAmount } = req.body;
  const actor = TRANSITIONS[booking.status]?.[next];
  if (!actor) throw new HttpError(409, `A ${booking.status} job cannot be changed to ${next}`);
  if (req.user.role !== actor) throw new HttpError(403, `Only the ${actor} can set this status`);
  const owner = actor === 'technician' ? booking.technicianEmail : booking.customerEmail;
  if (owner !== req.user.email) throw new HttpError(403, 'This booking does not belong to you');

  const set = { status: next, updatedAt: new Date() };
  if (next === 'completed') {
    if (!(finalAmount > 0)) throw new HttpError(400, 'finalAmount must be a number greater than 0');
    set.finalAmount = Math.round(finalAmount * 100) / 100;
  }
  // optimistic guard: only update if status has not changed meanwhile
  const updated = await col('bookings').findOneAndUpdate(
    { _id, status: booking.status }, { $set: set }, { returnDocument: 'after' });
  if (!updated) throw new HttpError(409, 'The booking was updated by someone else. Refresh and try again');
  res.json(updated);
}));

export default router;
