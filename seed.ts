/**
 * Seeds ONLY customer and technician accounts (no admin, no services/bookings).
 *
 *   npm run seed:users          (from server/)   – the web app must be running (accounts are created via BetterAuth)
 *
 * Add or edit entries below. Existing emails are skipped, so it is safe to run repeatedly.
 */
import { closeDb, connectDb } from './config/db.js';
import { ensureAccount, waitForClient } from './seed.js';

export const CUSTOMERS = [
  { name: 'Ayesha Rahman', email: 'customer@fixmate.com', password: 'Customer@123', phone: '+8801811111111', area: 'Banani, Dhaka', bio: '' },
  { name: 'Imran Hossain', email: 'imran@fixmate.com', password: 'Customer@123', phone: '+8801822222222', area: 'Mohammadpur, Dhaka', bio: '' },
  { name: 'Sadia Islam', email: 'sadia@fixmate.com', password: 'Customer@123', phone: '+8801833333333', area: 'Dhanmondi, Dhaka', bio: '' },
].map((u) => ({ ...u, role: 'customer' }));

export const TECHNICIANS = [
  { name: 'Rafiq Ahmed', email: 'rafiq@fixmate.com', password: 'Tech@1234', phone: '+8801711111111', area: 'Mirpur, Dhaka', bio: '9 years repairing smartphones and laptops. Certified Apple & Samsung service partner.' },
  { name: 'Nusrat Jahan', email: 'nusrat@fixmate.com', password: 'Tech@1234', phone: '+8801722222222', area: 'Dhanmondi, Dhaka', bio: 'Refrigeration and AC specialist with 7 years of field experience.' },
  { name: 'Tanvir Hasan', email: 'tanvir@fixmate.com', password: 'Tech@1234', phone: '+8801733333333', area: 'Uttara, Dhaka', bio: 'Licensed electrician, TV and washing machine repair expert.' },
].map((u) => ({ ...u, role: 'technician' }));

export async function seedAccounts() {
  await connectDb();
  await waitForClient();
  for (const acc of [...TECHNICIANS, ...CUSTOMERS]) {
    await ensureAccount(acc);
    console.log(`✔ ${acc.role.padEnd(10)} ${acc.email}`);
  }
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1].replace(/\\/g, '/')}`).href) {
  seedAccounts().then(() => closeDb()).then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
}