import { Router } from 'express';
import { z } from 'zod';
import { col, toObjectId, usersCol } from '../config/db.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { HttpError, asyncHandler } from '../utils/errors.js';
import { CATEGORIES, SERVICE_MODES, escapeRegex } from '../utils/constants.js';

const router = Router();
const PUBLIC = { approvalStatus: 'approved', isAvailable: true };

const serviceSchema = z.object({
  title: z.string().trim().min(3, 'Title must be at least 3 characters').max(120),
  category: z.enum(CATEGORIES),
  description: z.string().trim().min(20, 'Description must be at least 20 characters').max(2000),
  image: z.string().trim().min(5, 'Service image is required'),
  basePrice: z.coerce.number().positive('Base price must be a positive number'),
  estimatedDuration: z.string().trim().min(1, 'Estimated duration is required').max(60),
  serviceMode: z.enum(SERVICE_MODES),
  serviceArea: z.string().trim().min(2, 'Service area is required').max(120),
});

// ---------- Public ----------
router.get('/', asyncHandler(async (req, res) => {
  const { search, category, mode, sort = 'newest', minPrice, maxPrice } = req.query;
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(48, Math.max(1, parseInt(req.query.limit) || 12));
  const q = { ...PUBLIC };
  if (search) {
    const rx = new RegExp(escapeRegex(String(search).slice(0, 80)), 'i');
    q.$or = [{ title: rx }, { description: rx }, { technicianName: rx }, { serviceArea: rx }, { category: rx }];
  }
  if (CATEGORIES.includes(category)) q.category = category;
  if (SERVICE_MODES.includes(mode)) q.serviceMode = mode;
  if (minPrice || maxPrice) {
    q.basePrice = {};
    if (Number(minPrice) >= 0 && minPrice !== '') q.basePrice.$gte = Number(minPrice);
    if (Number(maxPrice) > 0) q.basePrice.$lte = Number(maxPrice);
  }
  const sortMap = { newest: { createdAt: -1 }, 'price-asc': { basePrice: 1 }, 'price-desc': { basePrice: -1 }, title: { title: 1 } };
  const [items, total] = await Promise.all([
    col('services').find(q).sort(sortMap[sort] || sortMap.newest).skip((page - 1) * limit).limit(limit).toArray(),
    col('services').countDocuments(q),
  ]);
  res.json({ items, total, page, pages: Math.ceil(total / limit) });
}));

router.get('/latest', asyncHandler(async (_req, res) => {
  const items = await col('services').find(PUBLIC).sort({ createdAt: -1 }).limit(6).toArray();
  res.json({ items });
}));


router.get('/mine', authenticate, requireRole('technician'), asyncHandler(async (req, res) => {
  const items = await col('services').find({ technicianEmail: req.user.email }).sort({ createdAt: -1 }).toArray();
  res.json({ items });
}));

router.post('/', authenticate, requireRole('technician'), validate(serviceSchema), asyncHandler(async (req, res) => {
  const doc = {
    ...req.body,
    technicianName: req.user.name,
    technicianEmail: req.user.email,
    approvalStatus: 'pending',
    isAvailable: true,
    createdAt: new Date(),
  };
  const { insertedId } = await col('services').insertOne(doc);
  res.status(201).json({ ...doc, _id: insertedId });
}));

async function ownedService(req) {
  const _id = toObjectId(req.params.id);
  if (!_id) throw new HttpError(404, 'Service not found');
  const service = await col('services').findOne({ _id, technicianEmail: req.user.email });
  if (!service) throw new HttpError(404, 'Service not found');
  return service;
}

router.put('/:id', authenticate, requireRole('technician'), validate(serviceSchema), asyncHandler(async (req, res) => {
  const service = await ownedService(req);
  const set = { ...req.body, approvalStatus: 'pending', updatedAt: new Date() }; // edits need re-approval
  await col('services').updateOne({ _id: service._id }, { $set: set });
  res.json({ ...service, ...set });
}));

router.patch('/:id/availability', authenticate, requireRole('technician'),
  validate(z.object({ isAvailable: z.boolean() })),
  asyncHandler(async (req, res) => {
    const service = await ownedService(req);
    await col('services').updateOne({ _id: service._id }, { $set: { isAvailable: req.body.isAvailable } });
    res.json({ ...service, isAvailable: req.body.isAvailable });
  }));

router.delete('/:id', authenticate, requireRole('technician'), asyncHandler(async (req, res) => {
  const service = await ownedService(req);
  await col('services').deleteOne({ _id: service._id });
  res.json({ success: true });
}));

// ---------- Public details (keep last) ----------
router.get('/:id', asyncHandler(async (req, res) => {
  const _id = toObjectId(req.params.id);
  const service = _id && (await col('services').findOne({ _id, ...PUBLIC }));
  if (!service) throw new HttpError(404, 'Service not found');
  const tech = await usersCol().findOne({ email: service.technicianEmail }, { projection: { name: 1, image: 1, area: 1, bio: 1 } });
  res.json({ ...service, technician: tech ? { name: tech.name, image: tech.image || null, area: tech.area || '', bio: tech.bio || '' } : null });
}));

export default router;
