export const CATEGORIES = ['Smartphone', 'Laptop & PC', 'AC', 'Refrigerator', 'TV', 'Washing Machine', 'Electrical'];
export const SERVICE_MODES = ['Home Visit', 'Shop Drop-off'];
export const ROLES = ['customer', 'technician', 'admin'];
export const ACTIVE_BOOKING = ['requested', 'accepted', 'in-progress'];
export const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
