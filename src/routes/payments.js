import { Router } from 'express';
import Stripe from 'stripe';
import { z } from 'zod';
import { env } from '../config/env.js';
import { col, toObjectId } from '../config/db.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { HttpError, asyncHandler } from '../utils/errors.js';

const router = Router();
let stripeClient;
const stripe = () => {
  if (!env.stripeKey) throw new HttpError(503, 'Stripe is not configured. Set STRIPE_SECRET_KEY in server/.env');
  return (stripeClient ??= new Stripe(env.stripeKey));
};

async function recordPayment(session) {
  if (session.payment_status !== 'paid') return null;
  const _id = toObjectId(session.metadata?.bookingId);
  const booking = _id && (await col('bookings').findOne({ _id }));
  if (!booking) throw new HttpError(404, 'Booking for this payment was not found');
  const paidAt = new Date();
  const doc = {
    bookingId: String(_id),
    serviceTitle: booking.serviceTitle,
    customerName: booking.customerName,
    customerEmail: booking.customerEmail,
    technicianName: booking.technicianName,
    technicianEmail: booking.technicianEmail,
    amount: (session.amount_total ?? 0) / 100,
    currency: 'usd',
    transactionId: typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id,
    stripeSessionId: session.id,
    paymentStatus: 'paid',
    paidAt,
  };
  try {
    await col('payments').updateOne({ stripeSessionId: session.id }, { $setOnInsert: doc }, { upsert: true });
  } catch (e) {
    if (e.code !== 11000) throw e; // duplicate (race) – already saved
  }
  await col('bookings').updateOne({ _id, paymentStatus: 'unpaid' }, { $set: { paymentStatus: 'paid', paidAt, updatedAt: paidAt } });
  return (await col('payments').findOne({ stripeSessionId: session.id })) || (await col('payments').findOne({ bookingId: String(_id) }));
}


export const webhookHandler = asyncHandler(async (req, res) => {
  if (!env.stripeWebhookSecret) throw new HttpError(503, 'STRIPE_WEBHOOK_SECRET is not configured');
  let event;
  try {
    event = stripe().webhooks.constructEvent(req.body, req.headers['stripe-signature'], env.stripeWebhookSecret);
  } catch (err) {
    throw new HttpError(400, `Webhook signature verification failed: ${err.message}`);
  }
  if (event.type === 'checkout.session.completed' || event.type === 'checkout.session.async_payment_succeeded') {
    await recordPayment(event.data.object);
  }
  res.json({ received: true });
});

router.post('/create-checkout-session', authenticate, requireRole('customer'),
  validate(z.object({ bookingId: z.string().min(1) })),
  asyncHandler(async (req, res) => {
    const _id = toObjectId(req.body.bookingId);
    const booking = _id && (await col('bookings').findOne({ _id, customerEmail: req.user.email }));
    if (!booking) throw new HttpError(404, 'Booking not found');
    if (booking.status !== 'completed') throw new HttpError(409, 'You can only pay for completed jobs');
    if (booking.paymentStatus === 'paid') throw new HttpError(409, 'This booking is already paid');

    const session = await stripe().checkout.sessions.create({
      mode: 'payment',
      customer_email: req.user.email,
      line_items: [{
        quantity: 1,
        price_data: {
          currency: 'usd',
          unit_amount: Math.round(booking.finalAmount * 100), // amount always comes from the DB
          product_data: { name: booking.serviceTitle, description: `Repair job by ${booking.technicianName}` },
        },
      }],
      metadata: { bookingId: String(booking._id), customerEmail: req.user.email },
      success_url: `${env.clientUrl}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${env.clientUrl}/payment/cancel`,
    });
    res.json({ url: session.url, sessionId: session.id });
  }));

router.get('/verify', authenticate, requireRole('customer'), asyncHandler(async (req, res) => {
  const sessionId = String(req.query.session_id || '');
  if (!sessionId.startsWith('cs_')) throw new HttpError(400, 'Invalid session id');
  let session;
  try {
    session = await stripe().checkout.sessions.retrieve(sessionId, { expand: ['payment_intent'] });
  } catch (e) {
    if (e instanceof HttpError) throw e;
    throw new HttpError(404, 'Checkout session not found');
  }
  if (session.metadata?.customerEmail !== req.user.email) throw new HttpError(403, 'This payment does not belong to you');
  if (session.payment_status !== 'paid') throw new HttpError(402, 'Payment has not been completed');
  const payment = await recordPayment(session);
  res.json(payment);
}));

router.get('/mine', authenticate, requireRole('customer'), asyncHandler(async (req, res) => {
  const items = await col('payments').find({ customerEmail: req.user.email }).sort({ paidAt: -1 }).toArray();
  res.json({ items });
}));

export default router;
