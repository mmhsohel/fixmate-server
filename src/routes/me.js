import { Router } from 'express';
import { z } from 'zod';
import multer from 'multer';
import { env } from '../config/env.js';
import { usersCol } from '../config/db.js';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { HttpError, asyncHandler } from '../utils/errors.js';

const router = Router();
router.use(authenticate);

router.get('/', (req, res) => res.json(req.user));

const profileSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(80),
  phone: z.string().trim().max(24).optional().default(''),
  area: z.string().trim().max(120).optional().default(''),
  bio: z.string().trim().max(600).optional().default(''),
  image: z.string().trim().max(1000).optional(),
});

router.patch('/', validate(profileSchema), asyncHandler(async (req, res) => {
  const set = { ...req.body, updatedAt: new Date() };
  if (set.image === undefined) delete set.image;
  await usersCol().updateOne({ email: req.user.email }, { $set: set });
  res.json({ success: true });
}));

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) =>
    /^image\/(png|jpe?g|webp|gif)$/.test(file.mimetype) ? cb(null, true) : cb(new HttpError(400, 'Only PNG, JPG, WEBP or GIF images are allowed')),
});

/** Image upload proxy – the ImgBB key never reaches the browser. */
router.post('/upload', upload.single('image'), asyncHandler(async (req, res) => {
  if (!env.imgbbKey) throw new HttpError(503, 'Image upload is not configured. Set IMGBB_API_KEY in server/.env');
  if (!req.file) throw new HttpError(400, 'Image file is required');
  const body = new URLSearchParams({ image: req.file.buffer.toString('base64') });
  const r = await fetch(`https://api.imgbb.com/1/upload?key=${env.imgbbKey}`, { method: 'POST', body });
  const json = await r.json().catch(() => null);
  if (!r.ok || !json?.success) throw new HttpError(502, json?.error?.message || 'Image upload failed');
  res.json({ url: json.data.display_url || json.data.url });
}));

export default router;
