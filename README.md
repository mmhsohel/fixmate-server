---

### 2. Server `README.md` (`fixmate-server/README.md`)

```markdown
# FixMate — Backend REST API & Payment Engine (Server)

This is the backend REST API for **FixMate**, built with **Node.js**, **Express.js**, and **MongoDB**. It enforces role-based access control (RBAC) via custom JWT middlewares, manages the strict repair job state machine, handles server-side search/filtering/sorting, and processes secure post-service payments via **Stripe Checkout & Webhooks**.

## 🌐 Live API & Repositories
* **Live API Base URL:** [https://your-fixmate-api.onrender.com](https://your-fixmate-api.onrender.com)
* **Live Frontend URL:** [https://your-fixmate-live-url.vercel.app](https://your-fixmate-live-url.vercel.app)
* **Client Repository:** [https://github.com/your-username/fixmate-client](https://github.com/your-username/fixmate-client)

---

## 🔐 Demo Credentials (For Evaluation)
| Role | Email | Password |
| :--- | :--- | :--- |
| **Admin** | `admin@fixmate.com` | `Admin@1234` |
| **Technician** | `tech@fixmate.com` | `Tech@1234` |
| **Customer** | `customer@fixmate.com` | `Customer@1234` |

---

## 🏗️ Database Architecture (4 Core Collections)
Alongside BetterAuth's authentication collections (`user`, `session`, `account`, `verification`), the platform operates on 4 structured MongoDB collections:
1. **`users`**: Stores user profiles, roles (`customer`, `technician`, `admin`), phone, area, and bio.
2. **`services`**: Stores technician service offerings, pricing, service modes, availability toggles, and admin `approvalStatus` (`pending`, `approved`, `rejected`).
3. **`bookings`**: Stores customer repair requests, snapshots of service details, status transitions (`requested` → `accepted` → `in-progress` → `completed` / `rejected` / `cancelled`), `finalAmount`, and `paymentStatus`.
4. **`payments`**: Stores idempotent Stripe payment records (`transactionId`, `stripeSessionId`, `amount`, `paidAt`) linked to completed bookings.

---

## 🛡️ Security & Business Rules Enforced
* **Custom JWT & Role Middlewares:** `verifyToken`, `verifyCustomer`, `verifyTechnician`, and `verifyAdmin` protect all private routes (`401 Unauthorized` / `403 Forbidden`) and prevent cross-user data access.
* **Server-Enforced State Pipeline:** Validates every status transition (e.g., only a technician owning the job can advance it; customers can only cancel while `requested`; editing an approved service resets `approvalStatus` to `pending`).
* **Duplicate Booking Guard:** Blocks customers from creating multiple active requests (`requested`, `accepted`, `in-progress`) for the same service.
* **Idempotent Stripe Integration:** Server calculates `finalAmount` directly from MongoDB (never trusting client amounts) and prevents duplicate payment entries across both Stripe Webhooks and session verification endpoints.

---

## 📡 Core API Endpoints

| Method | Endpoint | Access / Middleware | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/services` | Public | Server-side search, category/mode filter & sort |
| `GET` | `/api/services/:id` | Public | Fetch single approved & available service |
| `POST` | `/api/services` | `verifyToken`, `verifyTechnician` | Create new repair service (`pending`) |
| `PATCH` | `/api/services/:id` | `verifyToken`, `verifyTechnician` | Update service (resets to `pending`) or toggle availability |
| `DELETE` | `/api/services/:id` | `verifyToken`, `verifyTechnician` | Delete technician's own service |
| `POST` | `/api/bookings` | `verifyToken`, `verifyCustomer` | Submit a new repair request |
| `GET` | `/api/bookings/my` | `verifyToken`, `verifyCustomer` | Fetch logged-in customer's bookings |
| `PATCH` | `/api/bookings/:id/cancel` | `verifyToken`, `verifyCustomer` | Cancel a `requested` booking |
| `GET` | `/api/bookings/technician` | `verifyToken`, `verifyTechnician` | Fetch incoming jobs for technician |
| `PATCH` | `/api/bookings/:id/status` | `verifyToken`, `verifyTechnician` | Advance job status & set `finalAmount` on completion |
| `POST` | `/api/payments/create-checkout-session` | `verifyToken`, `verifyCustomer` | Create Stripe Checkout session for completed job |
| `GET` | `/api/payments/verify` | `verifyToken`, `verifyCustomer` | Verify Stripe session & record payment |
| `POST` | `/api/payments/webhook` | Stripe Signature Verified | Handle `checkout.session.completed` webhook events |
| `PATCH` | `/api/users/profile` | `verifyToken` | Update user profile details & avatar |
| `GET` | `/api/admin/users` | `verifyToken`, `verifyAdmin` | List all platform users |
| `PATCH` | `/api/admin/users/:id/role` | `verifyToken`, `verifyAdmin` | Update user role (prevents self-demotion) |
| `PATCH` | `/api/admin/services/:id/approval` | `verifyToken`, `verifyAdmin` | Approve or reject technician services |
| `GET` | `/api/admin/bookings` | `verifyToken`, `verifyAdmin` | View all platform bookings |
| `GET` | `/api/admin/payments` | `verifyToken`, `verifyAdmin` | View all Stripe transactions & total revenue |

---

## 🛠️ NPM Packages Used
* **Core:** `express`, `mongodb`, `cors`, `dotenv`
* **Authentication & Security:** `jsonwebtoken`, `better-auth`
* **Payments:** `stripe`
* **Dev Tools:** `nodemon` / `tsx`, `typescript`

---

## ⚙️ Local Setup & Installation

1. **Clone the repository:**
   ```bash
   git clone [https://github.com/your-username/fixmate-server.git](https://github.com/mmhsohel/fixmate-server.git)
   cd fixmate-server