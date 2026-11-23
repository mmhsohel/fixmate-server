import { pathToFileURL } from 'node:url';
import { env } from './config/env.js';
import { col, connectDb, usersCol } from './config/db.js';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export const SEED_ACCOUNTS = [
  { name: 'FixMate Admin', email: 'admin@fixmate.com', password: 'Admin@123', role: 'admin', phone: '+8801700000000', area: 'Gulshan, Dhaka', bio: 'Platform administrator.' },
  { name: 'Rafiq Ahmed', email: 'rafiq@fixmate.com', password: 'Tech@1234', role: 'technician', phone: '+8801711111111', area: 'Mirpur, Dhaka', bio: '9 years repairing smartphones and laptops. Certified Apple & Samsung service partner.' },
  { name: 'Nusrat Jahan', email: 'nusrat@fixmate.com', password: 'Tech@1234', role: 'technician', phone: '+8801722222222', area: 'Dhanmondi, Dhaka', bio: 'Refrigeration and AC specialist with 7 years of field experience.' },
  { name: 'Tanvir Hasan', email: 'tanvir@fixmate.com', password: 'Tech@1234', role: 'technician', phone: '+8801733333333', area: 'Uttara, Dhaka', bio: 'Licensed electrician, TV and washing machine repair expert.' },
  { name: 'Ayesha Rahman', email: 'customer@fixmate.com', password: 'Customer@123', role: 'customer', phone: '+8801811111111', area: 'Banani, Dhaka', bio: '' },
  { name: 'Imran Hossain', email: 'imran@fixmate.com', password: 'Customer@123', role: 'customer', phone: '+8801822222222', area: 'Mohammadpur, Dhaka', bio: '' },
];

const art = (emoji, c1, c2, label) =>
  'data:image/svg+xml;utf8,' + encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 500"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient></defs><rect width="800" height="500" fill="url(#g)"/><circle cx="660" cy="80" r="170" fill="#fff" opacity=".08"/><circle cx="90" cy="450" r="130" fill="#fff" opacity=".07"/><text x="400" y="285" font-size="170" text-anchor="middle">${emoji}</text><text x="400" y="400" font-size="34" font-family="sans-serif" font-weight="600" fill="#fff" text-anchor="middle" opacity=".92">${label}</text></svg>`);

const CAT = {
  Smartphone: ['📱', '#0f766e', '#14b8a6'],
  'Laptop & PC': ['💻', '#1e3a8a', '#3b82f6'],
  AC: ['❄️', '#0369a1', '#38bdf8'],
  Refrigerator: ['🧊', '#155e75', '#22d3ee'],
  TV: ['📺', '#4c1d95', '#8b5cf6'],
  'Washing Machine': ['🧺', '#9a3412', '#fb923c'],
  Electrical: ['⚡', '#854d0e', '#facc15'],
};

// [title, category, price, duration, mode, area, tech email, description]
const SERVICES = [
  ['iPhone Screen Replacement', 'Smartphone', 85, '2-3 hours', 'Shop Drop-off', 'Mirpur, Dhaka', 'rafiq', 'Genuine-grade OLED screen replacement for iPhone 11–15 with 6-month warranty. Includes free diagnostic and screen protector.'],
  ['Android Battery & Charging Port Fix', 'Smartphone', 30, '1-2 hours', 'Shop Drop-off', 'Mirpur, Dhaka', 'rafiq', 'Battery replacement and charging-port repair for Samsung, Xiaomi, Oppo and Vivo phones. Same-day service in most cases.'],
  ['Laptop Servicing & Thermal Paste', 'Laptop & PC', 40, '3-4 hours', 'Home Visit', 'Dhanmondi, Dhaka', 'rafiq', 'Full internal cleaning, fan service, thermal paste replacement and OS health check to fix overheating and slowness.'],
  ['Laptop Screen & Keyboard Repair', 'Laptop & PC', 70, '1 day', 'Shop Drop-off', 'Mirpur, Dhaka', 'rafiq', 'Replacement of cracked laptop displays, damaged keyboards and broken hinges for all major brands.'],
  ['Split AC Gas Refill & Servicing', 'AC', 55, '2 hours', 'Home Visit', 'Dhanmondi, Dhaka', 'nusrat', 'Complete split AC service: indoor/outdoor cleaning, gas pressure check and refill, drain flush and performance test.'],
  ['AC Installation & Uninstallation', 'AC', 65, '3 hours', 'Home Visit', 'Gulshan, Dhaka', 'nusrat', 'Professional installation or relocation of split and window ACs with copper piping and bracket mounting.'],
  ['Refrigerator Compressor Repair', 'Refrigerator', 90, '1 day', 'Home Visit', 'Dhanmondi, Dhaka', 'nusrat', 'Diagnosis and repair of compressor, thermostat and cooling issues for single and double-door refrigerators.'],
  ['Fridge Not Cooling – Gas Leak Fix', 'Refrigerator', 60, '3-4 hours', 'Home Visit', 'Mohammadpur, Dhaka', 'nusrat', 'Leak detection, welding and gas recharge for refrigerators that have stopped cooling. 90-day service warranty.'],
  ['LED/LCD TV Panel & Backlight Repair', 'TV', 75, '1-2 days', 'Shop Drop-off', 'Uttara, Dhaka', 'tanvir', 'Backlight strip replacement, panel line repair and mainboard fixes for Sony, Samsung, LG and Walton TVs.'],
  ['Smart TV Software & Wall Mounting', 'TV', 35, '1-2 hours', 'Home Visit', 'Uttara, Dhaka', 'tanvir', 'Smart TV software reset, app and network troubleshooting plus safe wall-mount installation.'],
  ['Washing Machine Drum & Motor Repair', 'Washing Machine', 65, '3-5 hours', 'Home Visit', 'Uttara, Dhaka', 'tanvir', 'Front and top-load washing machine repair: drum bearings, motor, drain pump, door lock and control board.'],
  ['Home Electrical Wiring & Fault Finding', 'Electrical', 45, '2-4 hours', 'Home Visit', 'Banani, Dhaka', 'tanvir', 'Short-circuit tracing, switchboard repair, MCB replacement and safe rewiring by a licensed electrician.'],
  ['Ceiling Fan & Light Installation', 'Electrical', 25, '1-2 hours', 'Home Visit', 'Uttara, Dhaka', 'tanvir', 'Installation and repair of ceiling fans, LED panels and decorative lighting with neat concealed wiring.'],
  ['PC Hardware Upgrade & Data Recovery', 'Laptop & PC', 50, '1 day', 'Shop Drop-off', 'Dhanmondi, Dhaka', 'rafiq', 'RAM/SSD upgrades, PSU replacement, virus removal and data recovery from failing drives.'],
];

export async function waitForClient(retries = 90) {
  for (let i = 0; i < retries; i++) {
    try {
      const r = await fetch(`${env.clientInternalUrl}/api/auth/ok`);
      if (r.ok) return true;
    } catch { /* not up yet */ }
    await sleep(2000);
  }
  throw new Error(`Next.js app not reachable at ${env.clientInternalUrl}`);
}

async function ensureAccount(acc) {
  if (!(await usersCol().findOne({ email: acc.email }))) {
    // BetterAuth rate-limits sign-up in production (≈3 per 10s) – retry politely on 429.
    for (let attempt = 0; attempt < 5; attempt++) {
      const r = await fetch(`${env.clientInternalUrl}/api/auth/sign-up/email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Origin: env.clientUrl },
        body: JSON.stringify({ name: acc.name, email: acc.email, password: acc.password, role: acc.role === 'technician' ? 'technician' : 'customer' }),
      });
      if (r.ok) break;
      if (r.status === 429) { await sleep(11000); continue; }
      throw new Error(`sign-up failed for ${acc.email}: ${r.status} ${await r.text()}`);
    }
    await sleep(3500);
  }
  await usersCol().updateOne({ email: acc.email }, { $set: { role: acc.role, phone: acc.phone, area: acc.area, bio: acc.bio } });
}

export async function runSeed() {
  await connectDb();
  await waitForClient();
  for (const acc of SEED_ACCOUNTS) await ensureAccount(acc);

  if (await col('services').countDocuments({ seed: true })) {
    console.log('✔ Seed: demo data already present');
    return;
  }
  const techs = Object.fromEntries((await usersCol().find({ role: 'technician' }).toArray()).map((u) => [u.email.split('@')[0], u]));
  const now = Date.now();
  const day = 86400000;

  const services = SERVICES.map(([title, category, basePrice, estimatedDuration, serviceMode, serviceArea, tech, description], i) => ({
    title, category, description, basePrice, estimatedDuration, serviceMode, serviceArea,
    image: art(...CAT[category], category),
    technicianName: techs[tech].name,
    technicianEmail: techs[tech].email,
    approvalStatus: 'approved',
    isAvailable: true,
    seed: true,
    createdAt: new Date(now - i * day),
  }));
  // a few moderation-queue examples
  services.push(
    { ...services[0], title: 'MacBook Logic Board Repair', category: 'Laptop & PC', image: art(...CAT['Laptop & PC'], 'Laptop & PC'), basePrice: 150, estimatedDuration: '2-3 days', description: 'Micro-soldering and logic board repair for MacBook Air and Pro models.', approvalStatus: 'pending', createdAt: new Date(now - 3600000) },
    { ...services[4], title: 'Inverter AC Deep Cleaning', image: art(...CAT.AC, 'AC'), basePrice: 40, approvalStatus: 'pending', createdAt: new Date(now - 7200000) },
    { ...services[10], title: 'Unlicensed Appliance Repair', image: art(...CAT['Washing Machine'], 'Washing Machine'), approvalStatus: 'rejected', createdAt: new Date(now - 9e6) },
  );
  const { insertedIds } = await col('services').insertMany(services.map(({ _id, ...s }) => s));
  const sid = (i) => String(insertedIds[i]);

  const cust = { ayesha: SEED_ACCOUNTS[4], imran: SEED_ACCOUNTS[5] };
  const mk = (si, c, status, d, extra = {}) => {
    const s = services[si];
    return {
      serviceId: sid(si), serviceTitle: s.title, serviceImage: s.image, category: s.category, basePrice: s.basePrice,
      technicianName: s.technicianName, technicianEmail: s.technicianEmail,
      customerName: c.name, customerEmail: c.email, customerPhone: c.phone,
      address: `House ${10 + si}, Road ${3 + si}, ${c.area}`,
      preferredDate: new Date(now + (3 - d) * day),
      problemDescription: `The device shows a problem related to "${s.title.toLowerCase()}". Please inspect and repair as soon as possible.`,
      status, finalAmount: s.basePrice, paymentStatus: 'unpaid', createdAt: new Date(now - d * day), ...extra,
    };
  };
  const bookings = [
    mk(0, cust.ayesha, 'completed', 9, { finalAmount: 92, paymentStatus: 'paid' }),
    mk(4, cust.ayesha, 'completed', 6, { finalAmount: 55 }),
    mk(6, cust.ayesha, 'in-progress', 3),
    mk(8, cust.ayesha, 'requested', 1),
    mk(2, cust.imran, 'completed', 12, { finalAmount: 45, paymentStatus: 'paid' }),
    mk(10, cust.imran, 'accepted', 2),
    mk(11, cust.imran, 'rejected', 5),
    mk(1, cust.imran, 'cancelled', 4),
    mk(5, cust.imran, 'requested', 0),
  ];
  const res = await col('bookings').insertMany(bookings);
  const payments = [0, 4].map((i, n) => {
    const b = bookings[i];
    return {
      bookingId: String(res.insertedIds[i]), serviceTitle: b.serviceTitle, customerName: b.customerName, customerEmail: b.customerEmail,
      technicianName: b.technicianName, technicianEmail: b.technicianEmail, amount: b.finalAmount, currency: 'usd',
      transactionId: `pi_seed_${n + 1}0000000abc`, stripeSessionId: `cs_test_seed_${n + 1}`, paymentStatus: 'paid', paidAt: new Date(now - (7 - n * 6) * day),
    };
  });
  await col('payments').insertMany(payments);
  console.log(`✔ Seed: ${services.length} services, ${bookings.length} bookings, ${payments.length} payments`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runSeed().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
}
