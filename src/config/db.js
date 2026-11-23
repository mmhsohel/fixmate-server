import { MongoClient, ObjectId } from 'mongodb';
import { env } from './env.js';

let client;
let db;

export async function connectDb() {
  if (db) return db;
  client = new MongoClient(env.mongoUri, { maxPoolSize: 20, serverSelectionTimeoutMS: 8000 });
  await client.connect();
  db = client.db(env.dbName);
  await ensureIndexes(db);
  return db;
}

export const col = (name) => db.collection(name);
export const usersCol = () => db.collection('user');

export function toObjectId(id) {
  return typeof id === 'string' && /^[a-f\d]{24}$/i.test(id) ? new ObjectId(id) : null;
}

async function ensureIndexes(database) {
  await Promise.all([
    database.collection('services').createIndexes([
      { key: { approvalStatus: 1, isAvailable: 1, createdAt: -1 } },
      { key: { technicianEmail: 1 } },
      { key: { category: 1 } },
    ]),
    database.collection('bookings').createIndexes([
      { key: { customerEmail: 1, createdAt: -1 } },
      { key: { technicianEmail: 1, createdAt: -1 } },
      { key: { serviceId: 1, customerEmail: 1, status: 1 } },
    ]),
    database.collection('payments').createIndexes([
      { key: { stripeSessionId: 1 }, unique: true },
      { key: { bookingId: 1 }, unique: true },
      { key: { customerEmail: 1, paidAt: -1 } },
    ]),
  ]);
}

export async function closeDb() {
  await client?.close();
  db = undefined;
}
