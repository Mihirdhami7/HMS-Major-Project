# HMS: Production Readiness Review & Roadmap

> Review date: 2026-11-01 · Branch: `NewFrontend` (including uncommitted changes)
> Scope: full read of `Backend/` (Django + DRF + pymongo) and `frontend/` (React + Vite), plus a live check of the MongoDB Atlas cluster.
> **No code was changed.** This file lists what is wrong, why it matters, and the order to fix it.

---

## 0. TL;DR: where the project stands

| Area | Status | One-line reason |
|---|---|---|
| Database | 🔴 **Gone** | The Atlas cluster `cluster0.sqzac.mongodb.net` no longer exists in DNS (deleted for inactivity). The old data is lost. |
| Security | 🔴 **Critical** | Password-free SuperAdmin login, anyone can sign up as Admin, password hashes in API responses, secrets committed to GitHub. |
| Frontend build | 🔴 **Fails** | `vite build` fails: pages import functions that no longer exist (`getToken`, etc.). |
| Frontend ↔ Backend | 🔴 **Mostly disconnected** | About 30 direct `axios` calls to `localhost` URLs that no longer exist. Pages read the wrong response shape and field names. |
| Core flows | 🟠 **Broken** | Login, booking, prescription, payments, product approval, medicines list, supplier pages. |
| Hardcoded data | 🟠 **Everywhere** | Hospital list, departments, stats, charts, notifications, "Zydus" fallbacks. |
| Deploy config | 🟠 **Not ready** | No `vercel.json`, Django `runserver` in Docker, CORS is localhost-only, `DEBUG` missing, no media storage. |
| Architecture choice | 🟢 **Salvageable** | The new structure (apps per domain + a service layer in React) is the right shape. It needs finishing, not a rewrite. |

**Decision: keep MongoDB (create a new Atlas cluster).** The whole backend uses raw `pymongo`. Switching to another database (Postgres and similar) would mean rewriting every view. Mongo Atlas M0 (free) is fine for this project. You only need a new cluster plus a seed script (see §6).

---

## 1. Fix order (do the phases in sequence)

```
Phase 0  Secrets & repo hygiene        (½ day)   ← do before ANY push
Phase 1  Critical security holes       (1–2 days)
Phase 2  New DB + seed data            (½ day)
Phase 3  Backend correctness & API     (3–5 days)
Phase 4  Frontend wiring to real APIs  (4–6 days)
Phase 5  Production infra & deploy     (1–2 days)
Phase 6  Hardening (tests, logs, CI)   (ongoing)
Phase 7  AI chatbot                    (only after 0–5 are done)
```

---

## Phase 0: Secrets & repo hygiene 🔴

These secrets are **already in public git history on GitHub** (`Mihirdhami7/HMS-Major-Project`). Removing them from the file is not enough; **rotate them**.

| # | What | Where | Action |
|---|---|---|---|
| 0.1 | Gmail app password `ivdi baqv …` | `Backend/backend/settings.py:182-184` | Revoke it in your Google account → App passwords. Generate a new one and put it **only** in `.env` (`EMAIL_HOST_USER`, `EMAIL_HOST_PASSWORD`). Better: use a transactional email service (Resend / Brevo / SendGrid free tier). |
| 0.2 | Razorpay test key + secret | `settings.py:33-34` (commented, but still in git) | Regenerate the keys in the Razorpay dashboard. Load them with `os.environ["RAZORPAY_KEY_ID"]` / `RAZORPAY_KEY_SECRET`. |
| 0.3 | Fallback `SECRET_KEY` | `settings.py:31` | Remove the fallback. In production, crash on startup if `SECRET_KEY` is missing. All JWTs are signed with it. |
| 0.4 | Mongo host hardcoded | `settings.py:220` uses `cluster0.sqzac…` and ignores `MONGO_CLUSTER` | Use a single `MONGO_URI` env var. |
| 0.5 | `Backend/node_modules/` committed (4,609 files) | git | `git rm -r --cached Backend/node_modules` and add it to `.gitignore`. Also delete `Backend/package.json`; jsPDF belongs in the frontend. |
| 0.6 | **Real users' resumes and prescriptions** committed | `Backend/media/**` | This is personal/medical data. `git rm -r --cached Backend/media` and add `media/` to `.gitignore`. Consider rewriting history (`git filter-repo`) since the repo is public. |
| 0.7 | `db.sqlite3` committed | `Backend/db.sqlite3` | `git rm --cached` and ignore it. |
| 0.8 | Stray root files | `/index.html`, `/tailwind.config.js`, `/test_mongo.py` | Delete them, or move `test_mongo.py` into `Backend/scripts/`. |
| 0.9 | Add `.env.example` files | `Backend/.env.example`, `frontend/.env.example` | Variable names only, no values (template in §5.4). |

Recommended root `.gitignore` additions:
```
node_modules/
Backend/media/
*.sqlite3
dist/
.env
.env.*
!.env.example
```

---

## Phase 1: Critical security holes 🔴

### 1.1 Authentication
| # | Issue | Location | Fix |
|---|---|---|---|
| 1.1.1 | **Anyone becomes SuperAdmin with any password.** The email `21it402@bvmengineering.ac.in` skips `bcrypt.checkpw`. | `apps/accounts/views.py:291-322` | Delete `bypass_emails` and every hardcoded-email branch. Create the SuperAdmin with a real hashed password through a one-off management script (`python manage.py create_superadmin`), store `userType: "SuperAdmin"` in the DB, and treat it like any other user. |
| 1.1.2 | **Anyone can self-register as Admin** of any hospital. | `accounts/serializers.py:15-18,108-117`, `views.py:98-102` | Public signup allows **Patient** only; maybe also Doctor and Supplier as *pending approval*. Admins are created only by SuperAdmin (with the hospital), and the hospital must exist. |
| 1.1.3 | **Unapproved doctors can log in**, then self-approve through `POST /api/users/doctors/<hospital>/` (which has `permission_classes = []`). | `accounts/views.py:303-308`; `users/views.py:29,68-73` | Login: reject a Doctor unless `isApproved`. Doctor POST: Admin/SuperAdmin of that hospital only. |
| 1.1.4 | JWT carries role and hospital, and the DB is never re-checked. Deleted or rejected users keep access for 4 h. | `accounts/authentication.py:39-44` | On each request, load the user (cache it if needed). Check `is_active` and the role. Revoke all sessions on password change. |
| 1.1.5 | Raw JWT stored in `sessions`. `exp` is not required. | `accounts/views.py:336-343`, `authentication.py:23` | Store a `jti` (or sha256 of the token). Use `jwt.decode(..., options={"require": ["exp"]})`. |
| 1.1.6 | OTP: `random` module, stored in plaintext, unlimited attempts, no resend. Unverified users are locked out forever. Frontend logs the OTP; backend returns `debug_otp`. | `backend/db.py:72`, `accounts/views.py:57,191-260`, `Signup.jsx:208` | Use `secrets.randbelow`, store a hash, allow at most 5 attempts, add a throttled `resend-otp` endpoint, allow re-registering unverified emails, remove `debug_otp`/console logs. |
| 1.1.7 | Account enumeration ("Account not activated" before the password check, different OTP errors). | `accounts/views.py:60,222,245,316` | Check the password first and return generic messages. |
| 1.1.8 | Password change does not ask for the current password. | `accounts/views.py:603-606` | Require `currentPassword`. |

### 1.2 Authorization (who can see or change what)
Rule for a hospital system: **every query must be scoped by the logged-in user**, never by a value the client sends.

| # | Issue | Location | Fix |
|---|---|---|---|
| 1.2.1 | **Password hashes returned** (field is `hpassword`, but code excludes `password`). Profile update even copies `hpassword` into `staff`, and the **public** doctor list returns it. | `users/views.py:54,261,418,490,555,639,676`; `accounts/views.py:606,663` | Write one `public_user(doc)` serializer with a **whitelist** of fields and use it everywhere. Never `$set` the profile dict into `staff`. |
| 1.2.2 | Profile update lets users change `hospitalName`, so an admin can take over another hospital. | `accounts/views.py:596` | Whitelist editable fields: name, contact, gender, DOB, photo. |
| 1.2.3 | Patient can book an appointment **as another patient**. Admin can book into **another hospital**. | `appointments/views.py:64,79,131` | Patient: `patientEmail = request.user.email`. Admin: `hospitalName = request.user.hospitalName`. |
| 1.2.4 | Any logged-in user can read **any hospital's** products, prices and stock. An admin with no `hospitalName` sees all unapproved products. | `orders/views.py:53-56,149-152,123` | Always filter by `request.user.hospitalName` (SuperAdmin exempt). |
| 1.2.5 | Hospital admin can rename the hospital or change `adminEmail` (hand-over). | `hospitals/serializers.py:16,68-88` | Only SuperAdmin can change `name` and `adminEmail`. |
| 1.2.6 | Order can be "completed" with **any** payment id, including the NoSQL operator `{"$ne": null}`. | `orders/views.py:464,498-516` | Accept only a `str`. Match `{razorpay_payment_id, purchase_order_id: order_id, status: "SUCCESS"}` and mark the payment as consumed. |
| 1.2.7 | Doctor reject deletes **approved** doctors too. Doctors can PUT/DELETE patients. | `users/views.py:371,547,570,598` | Add `isApproved: False` to the filter. Patient writes are Admin-only. |
| 1.2.8 | Public doctor list exposes contact, address, email and certificate URL. Hospital list exposes `adminEmail` to patients. | `users/views.py:54,418`; `hospitals/views.py:293` | Use separate **public** serializers (name, specialization, department, photo). |

### 1.3 Role names: pick ONE spelling
Today the code uses `"superAdmin"` (token), `"SuperAdmin"` (serializer), and `"superadmin"` (permissions). Some permission classes compare case-sensitively and others lowercase. As a result, SuperAdmin fails `IsAdmin` and `IsPatientOrAdmin`, and the SuperAdmin profile returns 404 (`userType.capitalize()` gives `"Superadmin"`).

**Fix:** create `apps/accounts/roles.py`:
```python
class Role:
    PATIENT="Patient"; DOCTOR="Doctor"; ADMIN="Admin"; SUPPLIER="Supplier"; SUPERADMIN="SuperAdmin"
```
Use only these constants in models, serializers, the JWT payload, `permissions.py` and the frontend (`frontend/src/constants/roles.js`). Remove every `.lower()` and `.capitalize()` role comparison.

### 1.4 Uploads
`doctorCertificate`, `companyLicense` and `photo` have no type or size check. Any file, including HTML or SVG (stored XSS), is saved under `media/<email>/<original filename>` (`accounts/models.py:16-25`).
**Fix:** allow only `pdf/jpg/png`, max 5 MB, `uuid4` filenames, store them in object storage (Cloudinary / S3 / Supabase Storage). Serve certificates and licences only through an authenticated endpoint or signed URL.

### 1.5 Error leakage
About 50 places return `str(e)` to the client (e.g. `accounts/views.py:138,158,…`, `users/views.py:66,113,…`, `appointments/views.py:168,381,…`, `hospitals/views.py:65,99,…`).
**Fix:** add one DRF `EXCEPTION_HANDLER` that logs the exception and returns `{"status":"error","message":"Something went wrong"}`. Remove the per-view `try/except Exception`.

---

## Phase 2: New database + seed data 🗄️

### 2.1 What I verified
```
cluster0.sqzac.mongodb.net            → NXDOMAIN (also via 8.8.8.8)
_mongodb._tcp.cluster0.sqzac.mongodb.net → NXDOMAIN
mongodb.com                            → resolves (network OK)
```
The cluster has been **deleted**. Atlas pauses and eventually removes free clusters that see no activity. The free tier has no backups, so the old data cannot be recovered.

### 2.2 Steps
1. Atlas → new project → **M0 free cluster** (region close to your backend host, e.g. Mumbai `ap-south-1`).
2. Database user with a strong password. Under Network Access, add your backend host's egress IPs (or `0.0.0.0/0` with a strong password if the host has dynamic IPs).
3. Put the full SRV string in `MONGO_URI`.
4. Create **unique** indexes (in `backend/db.py → ensure_indexes`, and make it fail loudly):
   - `users.email` (unique), `staff.email` (unique)
   - `hospitals.name` (unique), `departments(hospitalName, name)` (unique)
   - `prescriptions.appointmentId` (unique)
   - `payments.razorpay_payment_id` (unique)
   - `sessions.jti` (unique) + TTL on `expires_at`
   - appointments: partial unique on `(doctor.email, appointmentDate, appointmentTime)` where `status ∈ {pending, approved}`, to prevent double booking
5. Write **`Backend/scripts/seed.py`** (idempotent, upserts), so the DB can be rebuilt any time:
   - 1 SuperAdmin (password read from env)
   - 2–3 hospitals + 1 Admin each
   - 4–6 departments per hospital
   - 2–3 approved doctors per department, with `time_slot`
   - 1 Supplier + 10–20 products, `is_approved: true`, with `stock`
   - 3–5 patients, some appointments in each status, and prescriptions, so **history pages show real data**
6. **Back up regularly:** `mongodump --uri "$MONGO_URI" --out backups/$(date +%F)`, kept outside git. Also log in to Atlas periodically so the cluster isn't reclaimed again.

### 2.3 SQLite is still in use
`settings.py:95` still configures SQLite for Django's `admin`, `auth`, `sessions` and `messages`. You don't use them (auth is custom JWT on Mongo), and SQLite is wiped on every redeploy on most hosts.
**Fix:** remove `django.contrib.admin`, `sessions`, `messages`, the session middleware and the `admin/` URL, and set `DATABASES = {}`. Or keep `contenttypes`/`auth` for DRF and point them at a dummy in-memory SQLite.

---

## Phase 3: Backend correctness & API contract ⚙️

### 3.1 Settings (`Backend/backend/settings.py`)
| Setting | Now | Production value |
|---|---|---|
| `DEBUG` | **missing** (removed in the uncommitted diff, so it defaults to False and `/media` is no longer served locally) | `DEBUG = env("DEBUG","False")=="True"` |
| `ALLOWED_HOSTS` | `*` default | `api.yourdomain.com,<render-app>.onrender.com` |
| `CORS_ALLOWED_ORIGINS` | localhost only | `https://<your-app>.vercel.app` (+ custom domain), from env |
| `CSRF_TRUSTED_ORIGINS` | missing | same as CORS |
| `SECURE_*` | missing | `SECURE_PROXY_SSL_HEADER`, `SECURE_SSL_REDIRECT`, `SECURE_HSTS_SECONDS`, `SESSION_COOKIE_SECURE`, `CSRF_COOKIE_SECURE` |
| `REST_FRAMEWORK` | anon throttle only; no default auth/permission | see below |
| `LOGGING` | missing | console JSON logging (hosts collect stdout) |
| `from backend import settings` | used in views/auth/models | use `from django.conf import settings` everywhere |

```python
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": ["apps.accounts.authentication.JWTAuthentication"],
    "DEFAULT_PERMISSION_CLASSES": ["rest_framework.permissions.IsAuthenticated"],  # secure by default
    "DEFAULT_THROTTLE_CLASSES": [
        "rest_framework.throttling.AnonRateThrottle",
        "rest_framework.throttling.UserRateThrottle",
        "rest_framework.throttling.ScopedRateThrottle",
    ],
    "DEFAULT_THROTTLE_RATES": {
        "anon": "30/min", "user": "120/min",
        "login": "5/min", "otp": "5/min", "register": "3/min", "payment": "10/min",
    },
    "DEFAULT_PAGINATION_CLASS": "<your Mongo paginator>",
    "EXCEPTION_HANDLER": "backend.exceptions.handler",
}
```
Then mark the truly public views (login, register, verify-email, public hospital/doctor lists) with `permission_classes=[AllowAny]` and give login and OTP views `throttle_scope`.

**Rate limiting in production:** DRF throttles keep their counters in Django's cache. The default LocMem cache is per-process, so with 2+ gunicorn workers the limit doesn't hold. Use **Redis** (Upstash free tier) as `CACHES["default"]`. Set `NUM_PROXIES = 1` behind Render/Railway so the client IP is correct.

### 3.2 Broken endpoints / flows (verified)
| # | Bug | Location | Fix |
|---|---|---|---|
| 3.2.1 | **Payments reject every app call.** No `JWTAuthentication`; `user.id` doesn't exist on the user object (`AttributeError`); Razorpay keys are undefined. | `payments/views.py:20,32,52,64,111` | Add JWT auth, use `user.email`, load the keys from env. |
| 3.2.2 | **Amount comes from the client. Verify saves nothing.** | `payments/views.py:74,127-157` | Compute the amount on the server from the appointment/order/invoice. Store `{razorpay_order_id, amount, purpose, ref_id, status:"created"}` at order creation. On verify, check the signature and `client.order.fetch`, then update the record to `SUCCESS` (unique on `razorpay_payment_id`). Add a **webhook** `/api/payments/razorpay/webhook/` as the source of truth. |
| 3.2.3 | **Product approve always 500s** (`request.user.id`). `approved_by` is spoofable. | `orders/views.py:178` | `approved_by = request.user.email`. |
| 3.2.4 | **Doctor medicine list always empty**: filters `quantity`, but products store `stock`. | `appointments/views.py:706` | `{"stock":{"$gt":0},"is_approved":True,"hospitalName":…}` |
| 3.2.5 | **Stock never changes**, neither when medicines are given nor when an order completes. | `appointments/views.py` (prescription), `orders/views.py:522-528` | Atomic `$inc` with a `stock >= qty` guard, inside a Mongo transaction. |
| 3.2.6 | **Shadowed routes**: `doctors/<hospital_name>/` matches before `doctors/<doctor_id>/` (same for patients), so the detail/update/delete views are unreachable. | `users/urls.py:17-29` | Change the routes to `doctors/hospital/<name>/` and `doctors/id/<id>/`. |
| 3.2.7 | Approving on the **same day with a different time** gets rejected ("beyond 7 days"). | `appointments/views.py:358-380` | Use `0 <= delta <= 7`, with a separate error for past dates. |
| 3.2.8 | **Double booking**: the check covers only the same patient+doctor, and is check-then-insert. Unapproved doctors are bookable. | `appointments/views.py:76-99` | Check the doctor+slot. Look up the doctor in `staff` with `isApproved`. Rely on the partial unique index from §2.2. |
| 3.2.9 | Approve/reject race. Past appointments can be approved. | `appointments/views.py:388,416` | Filter on `status:"pending"`, check `modified_count`, reject past dates. |
| 3.2.10 | Duplicate prescriptions on double submit. `str(None)` fallback ids. | `appointments/views.py:873-912,886,893` | Unique index + conditional update; drop the fallback. |
| 3.2.11 | Order status: fulfill works from any status, and complete works from `requested`. `total_price` is stale. Created order has no `id` in the response. | `orders/views.py:416-428,522`; `orders/serializers.py:88-110` | Use an explicit state machine (`requested → fulfilled → paid → completed`) with conditional updates. Recompute the total on the server. Return `id`. |
| 3.2.12 | Order fields (`product_name`, `price_per_strip`, …) come from the client. | `orders/serializers.py:90-99` | Load the product by `product_id` and copy the fields from it. |
| 3.2.13 | Hospital `PUT` → 500 (`get_object()` missing an argument). | `hospitals/views.py:116,329` | `http_method_names = ["patch", …]`. |
| 3.2.14 | `get_company_name` has no JWT auth and an object permission that can never pass. | `accounts/views.py:675-692` | Add JWT and let the Supplier read their own record. |
| 3.2.15 | Admin-created patients have no password, so they can never log in. | `users/views.py:518-528` | Generate an invite link or a temporary password and email it. |
| 3.2.16 | `PatientByDepartment` filters a field that patients don't have. | `users/views.py:675` | Derive it from appointments in that department. |
| 3.2.17 | Profile update writes `doctorQualification`/`doctorSpecialization`, but staff uses `qualification`/`specialization`. | `accounts/views.py:619-622` | Use one schema (see 3.4). |
| 3.2.18 | Naive datetimes. `datetime.now()` (local) is compared with `utcnow()`, so OTPs and JWTs expire immediately on non-UTC machines (your Windows PC is IST). | `db.py:86,90`, `accounts/views.py:325`, `users/views.py:166,224,…` | Use `datetime.now(timezone.utc)` everywhere and `MongoClient(..., tz_aware=True)`. Return ISO-8601 with `Z`. |
| 3.2.19 | Sending SMTP email blocks the request (timeout 60 s). | `accounts/views.py:131,177` | Send in a background thread at minimum. Better: an email API (Resend/Brevo) or a queue (RQ/Celery). |

### 3.3 Missing endpoints the UI and real-life use need
- **Public:** `GET /api/public/hospitals/` (name + id), `GET /api/public/hospitals/<id>/departments/`, `GET /api/public/doctors/?hospital=&department=`. Login and Signup need these **before** login (they're currently hardcoded because the real ones require auth).
- **Appointments:** detail, **cancel** (patient), **reschedule**, and doctor "complete without prescription".
- **Patient history:** `GET /api/appointments/patients/<patient_email>/history/`, for a doctor or admin of the same hospital. It returns all past appointments and prescriptions across doctors. This is what "history from backend, not pasted" needs.
- **Invoices:** `invoices_collection` exists but is unused, and the invoice view is commented out (`appointments/urls.py:14,32`). Add create (on prescription/dispense) → pay → mark paid.
- **Products:** update/delete. **Orders:** cancel.
- **Notifications:** `GET /api/notifications/` and `PATCH …/read/`. They're written to `notifications` already, but nothing reads them, and the header shows a fake "2 unread".
- **Dashboards (real stats):** `GET /api/reports/admin/`, `/supplier/`, `/superadmin/`, `/patient/`. Use Mongo aggregation (counts per status, revenue per month, top products) to replace all the fake numbers.
- **Auth:** `resend-otp`, `forgot-password`, `reset-password`, `refresh` (see 4.1).

### 3.4 Data model: write it down once
Create `Backend/docs/SCHEMA.md` with every collection and its fields. Currently the same thing has different names in different places:
`users` vs `staff` duplication for doctors, `role` vs `userType`, `isApproved` vs `is_approved`, `stock` vs `quantity`, `createdAt` vs `created_at`, `doctorSpecialization` vs `specialization`.
Pick **one** convention (recommend camelCase, since the frontend is JS). Then either:
- keep the `staff` collection only for hospital-specific info and **never copy auth fields into it**, or
- merge doctor info into `users` and drop `staff`. This is simpler and recommended.

Delete the unused `temp_appointments`, `temp_products`, `doctors` collections and their dead model helpers.

### 3.5 Consistent API response format
Use one shape for every endpoint, so the frontend can rely on it:
```json
// success (single)  { "status": "success", "data": { ... } }
// success (list)    { "status": "success", "data": [ ... ], "meta": { "page":1, "pageSize":20, "total": 134 } }
// error             { "status": "error", "message": "Human readable", "errors": { "field": ["..."] } }
```
Today the list responses use different keys (`appointments`, `doctors`, `products`, `medicines`, `orders`, …), and **every page reads `result.data` as an array, so all lists render empty.** Either standardise the backend to `data` (recommended) or fix each page. Add **pagination** to every list endpoint; they currently load whole collections.

### 3.6 Run it like production
- `requirements.txt`: **pin versions** (`pip freeze`) and add `gunicorn`, `whitenoise` (if serving static), `sentry-sdk`.
- `Dockerfile`: `python:3.12-slim`; run as non-root; `CMD gunicorn backend.wsgi:application --bind 0.0.0.0:$PORT --workers 3 --timeout 60`. Never `runserver`.
- `docker-compose.yml`: remove `makemigrations` (it generates migrations at runtime), and remove `DEBUG=1` for production.
- Health check: `GET /api/health/` that pings Mongo.

---

## Phase 4: Frontend wiring to real APIs 🖥️

### 4.1 Blockers
| # | Issue | Fix |
|---|---|---|
| 4.1.1 | **`npm run build` fails.** 9 pages import `getToken` from `authService` (doesn't exist), and ~12 more functions are imported from the wrong service or don't exist (`getHospitalDepartments`, `getPendingDoctors`, `getHospitalPrescriptions`, `getHospitalAppointments`, `rejectAppointment`, `getPatientByEmail`, `getHospitalProducts`, `getHospitalStockRequests`, `getDoctorAppointments`, …). | Use `const { token } = useAuth()` instead of `getToken()`. Map each old call to the new service (table below). Note: the new services take `(token, ...)` first; old calls pass `(data, token)`. |
| 4.1.2 | **Linux case-sensitivity** (Vercel builds on Linux): `Home.jsx:2` imports `insights` (file is `Insights.jsx`); `Home.jsx:4` imports `FindDoctor` (file is `FIndDoctor.jsx`). | Rename to consistent PascalCase with `git mv` (two steps on Windows: `git mv FIndDoctor.jsx tmp.jsx && git mv tmp.jsx FindDoctor.jsx`). |
| 4.1.3 | **Login never works.** `Login.jsx:82-88` reads `result.token`/`result.user`, but the API returns `result.data.access`/`result.data.userData`. There's no SuperAdmin redirect. The hospital list is hardcoded. | Read `result.data.*`. Add a SuperAdmin case. Fetch hospitals from the public endpoint. |
| 4.1.4 | **Every refresh logs the user out.** The token is only in React state (`AuthContext.jsx`). | Recommended: the backend sets a **refresh token in an `httpOnly; Secure; SameSite=None` cookie**, and the access token (15 min) stays in memory. On app load, call `POST /api/accounts/refresh/` to restore the session. Simpler alternative: store the access token in `sessionStorage` and call `/verify/` on load, which is weaker against XSS. |
| 4.1.5 | About **30 direct `axios`/`fetch` calls to `http://127.0.0.1:8000` / `localhost:8000`**, most hitting routes that **no longer exist** (`/api/add_department/`, `/orders/request_stock/`, `/payments/create_payment/`, `get_supplier_products`, …). In Department, GiveMedicine, NewRegister, Products, Patients/Appointments, SupplierProducts, Signup (where `axios` isn't even imported) and Profile (image URL). | Delete every direct call and use the service functions. Rule: **only `src/services/*` may import axios**. Add an ESLint `no-restricted-imports` rule for axios outside services. |
| 4.1.6 | Booking sends `requestedTime`, but the backend requires `appointmentTime`. Booking only runs after a Razorpay flow that calls dead endpoints. | Match the serializer. Order the flow: book (pending) → pay → backend marks it paid. |
| 4.1.7 | Prescription medicines lack `quantity`/`price`, and `medicineId` is undefined (`Prescription.jsx:138,894-900`). | Send `{medicineId, quantity, dosage, frequency, duration}`; the server fills in the price. |

Old call → new service mapping:
| Old (missing) | Use |
|---|---|
| `getToken()` | `useAuth().token` |
| `getUserProfile`, `updateUserProfile` (from userService) | `authService` |
| `getHospitalMedicines`, `savePrescription`, `approveAppointment` (from userService) | `appointmentsService` |
| `getHospitalDepartments(name)` | `hospitalService.listDepartments(token, hospitalId)` (needs the **id**) |
| `getPendingDoctors` | `userService.listPendingDoctors` |
| `getHospitalPrescriptions` | `getPendingPrescriptions` / `getAllPrescriptions` |
| `getHospitalAppointments` | `getPendingAppointments` / `getAllAppointments` |
| `rejectAppointment` | `approveAppointment(token, id, { action: "reject" })` |
| `getPatientByEmail` | `searchPatient` |
| `getHospitalProducts` | `orderService.listProducts` |
| `getHospitalStockRequests` | `orderService.listOrders` |
| `getDoctorAppointments` | `getMyAppointments` |

### 4.2 Response-shape & field-name mismatches (after the build passes, lists will still be empty)
- `/accounts/profile/me/` returns `{status, user:{…}}`, but 11 pages read `result.data.name`. Combined with `|| "Zydus"` fallbacks, **admins silently operate on the Zydus hospital**.
- Lists are wrapped (`{appointments:[…]}`), but pages check `Array.isArray(result.data)`, so every list is empty. Fixed by §3.5.
- Products: pages use old CSV keys (`"Product Name"`, `"Price (Per Unit/Strip)"`, `"Stock"`), but the backend uses `product_name`, `price_per_strip`, `stock`.
- Appointments and prescriptions: pages read flat `patientName`/`doctorEmail`, but the backend returns nested `patient{}`/`doctor{}`. Status `"approve"` vs `"approved"`. Typo `confrimedTime` vs `acceptedTime`.
- Departments: `_id`/`Description` vs `id`/`description`.
- `setError(result.error)` passes an **object**, so React crashes when rendering it (Department, NewRegister, DoctorSection, DoctorAppointments, Profile). Use `result.message`.
- Pages read `localStorage`/`sessionStorage` keys that nothing writes (`userEmail`, `session_Id`, `companyName`, `hospitalName`). As a result **the Supplier pages never load**. Use `useAuth()`.

**Tip:** define the field names once in `src/types/` (JSDoc typedefs) or move to TypeScript later, so mismatches show up in the editor.

### 4.3 Hardcoded / fake data to replace with API data
| Page | Hardcoded | Replace with |
|---|---|---|
| Login, Signup | Hospital list `["Zydus","Iris","Agrawal Medical"]`, departments | public hospitals/departments API |
| NewRegister, SupplierProducts | Department lists | departments API |
| AdminSection | Zydus address/phone, stats "100+/35+", fake recent activity | hospital detail + `/reports/admin/` + notifications |
| Admin/Dashboard | Power BI **demo** iframes | `/reports/admin/` + recharts (already installed) |
| SuperAdmin/Hospital, SuperAdminSection | 3 dummy hospitals, fake revenue, fake stats | hospitals API + `/reports/superadmin/` |
| SuperAdmin/AdminDashboard, Reports | empty components | build them or remove the routes |
| SupplierDashboard | all stats/orders/charts faked with `setTimeout` | `/reports/supplier/` + supplier orders |
| PatientSection | fake chart, "health score 82", "3 records", name = "Patient" | `/reports/patient/` + profile |
| DoctorAppointments, MedicalProducts | Zydus/Iris logos and blurbs (images missing) | hospital API (`logoUrl`, `description`) |
| Header | sample notifications, "2 unread" | notifications API |
| Home (Insights, FindDoctor, Testimonials, Hero stats) | fake doctors, stats | public doctors API + public stats endpoint. Testimonials can stay static marketing content, but label it as such. |
| `|| "Zydus"` fallbacks | Department, GiveMedicine, NewRegister, Products, Prescription, Patients/Appointments | **remove**. If `hospitalName` is missing, show an error. |
| Patients/Disease.jsx | static disease catalogue | acceptable as static content, or move to the DB later (useful for the AI chatbot) |

### 4.4 Routing & UX bugs
- Nested `<Routes>` in DoctorSection, PatientSection, SupplierSection and SuperAdminSection use absolute paths under parents without `/*`, so only the fallback renders.
- Dead links: `/admin/reports`, `/admin/profile`, `/superadmin/profile`, `/accounts/register` (should be `/register`), `/patient/book-appointment`, `/about`.
- No global 401 handling. Add an axios **response interceptor** in `apiClient.js`: on 401, try a refresh once, otherwise call `logout()` and redirect to `/login`.
- No loading/empty/error states on many lists. Add a shared `<AsyncState>` component.
- Razorpay checkout script is injected in 3 places and never removed. Load it once via a `loadRazorpay()` helper.

### 4.5 Cleanup
- **Remove console logs of secrets/PII:** `Login.jsx:76` (plaintext password!), `Signup.jsx:208` (OTP), `Profile.jsx:30` (token), plus about 12 others. Add the ESLint rule `no-console: ["error", {allow:["error"]}]`.
- Unused deps: `@tailwindcss/vite` (v4; you use Tailwind v3 via PostCSS), `autotable`, `next-themes`, `uuid`, `jwt-decode`, `@mui/icons-material`.
- Undeclared deps: `prop-types` and `clsx` are imported but only resolve transitively. Add them to `package.json`.
- Two lockfiles (`yarn.lock` + `package-lock.json`): keep one (npm).
- Dead files: `components/DoctorInfo.jsx` (empty), `SlidePanel.jsx`, `context/UserContext.jsx` (fake "John Doe"), `Home/ContactUs.jsx`, `pages/Doctors/FindDoctor.jsx`, `assets/data/*.js`, `src/index.css` (never imported).
- `via.placeholder.com` images: the service is gone. Use local placeholders. `/default-avatar.png`, `iris.png`, `default-hospital.png` don't exist. Don't use `/public/...` in paths; use `/images/...`.
- ESLint: 66 errors. Fix them, then add `npm run lint && npm run build` to CI.

---

## Phase 5: Production infrastructure & deployment 🚀

### 5.1 Where to host what
| Piece | Recommended | Why |
|---|---|---|
| Frontend (React/Vite) | **Vercel** | Static SPA, free, preview deploys per PR. |
| Backend (Django + pymongo) | **Render** / **Railway** / **Fly.io** (Docker) | Vercel's Python runtime is serverless. Cold starts, a new Mongo connection per invocation, no persistent disk for uploads, and request time limits make it a poor fit for Django. Render's free tier sleeps after inactivity; the paid starter tier doesn't. |
| Database | **MongoDB Atlas M0** (new cluster) | §2 |
| Files (photos, certificates) | **Cloudinary** or **S3 / Cloudflare R2 / Supabase Storage** | Container disks are wiped on redeploy. `django-storages` makes this a settings change. |
| Rate-limit cache | **Upstash Redis** (free) | Shared throttle counters across workers. |
| Email | **Resend / Brevo** | Gmail SMTP is rate-limited and fragile. |
| Errors | **Sentry** (free) | Backend + frontend. |
| Domain | Optional: `app.yourdomain` → Vercel, `api.yourdomain` → Render | Same-site cookies are easier with one parent domain. |

### 5.2 Vercel setup (frontend)
1. Vercel → Import the GitHub repo → **Root Directory: `frontend`** (lowercase, as git tracks it; the folder on your disk shows as `Frontend` but git sees `frontend`).
2. Framework: Vite. Build `npm run build`. Output `dist`.
3. Environment variable: `VITE_API_BASE_URL=https://<your-backend>.onrender.com/api`.
4. Add `frontend/vercel.json` so refreshing deep links (`/doctor/appointments`) doesn't 404:
   ```json
   { "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }] }
   ```
5. In `endpoints.js`, keep the localhost fallback **only** for `import.meta.env.DEV`. In production, throw if `VITE_API_BASE_URL` is missing.
6. Add the Vercel URL (and custom domain) to the backend's `CORS_ALLOWED_ORIGINS` and `CSRF_TRUSTED_ORIGINS`.
7. Set `SameSite=None; Secure` if you use refresh cookies across `vercel.app` ↔ `onrender.com`.

### 5.3 Backend deploy (Render example)
- New Web Service → Docker → root `Backend/`.
- Health check path `/api/health/`.
- Add all env vars (§5.4).
- Add the Render outbound IPs in Atlas Network Access.
- After the first deploy: run `python scripts/seed.py` once (Render Shell).

### 5.4 Environment variables
**`Backend/.env.example`**
```
DJANGO_ENV=production
DEBUG=False
SECRET_KEY=
ALLOWED_HOSTS=api.example.com,hms-api.onrender.com
CORS_ALLOWED_ORIGINS=https://hms.vercel.app
CSRF_TRUSTED_ORIGINS=https://hms.vercel.app
MONGO_URI=mongodb+srv://<user>:<pass>@<cluster>/<db>?retryWrites=true&w=majority
MONGO_DATABASE=hms
REDIS_URL=
EMAIL_PROVIDER_API_KEY=
DEFAULT_FROM_EMAIL=HMS <no-reply@example.com>
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
RAZORPAY_WEBHOOK_SECRET=
STORAGE_BUCKET= / CLOUDINARY_URL=
SENTRY_DSN=
SUPERADMIN_EMAIL=
SUPERADMIN_PASSWORD=        # used once by the seed/create_superadmin script
JWT_ACCESS_MINUTES=15
JWT_REFRESH_DAYS=7
```
**`frontend/.env.example`**
```
VITE_API_BASE_URL=http://127.0.0.1:8000/api
VITE_SENTRY_DSN=
```

### 5.5 Production checklist
- [ ] Secrets rotated, none in git, `.env.example` committed
- [ ] `DEBUG=False`, `ALLOWED_HOSTS`/CORS/CSRF set, HTTPS + HSTS
- [ ] Default `IsAuthenticated`; public endpoints explicitly `AllowAny`
- [ ] Throttling on login/OTP/register/payment with a Redis cache
- [ ] No `str(e)` responses; logging + Sentry
- [ ] Unique indexes created; seed script runs cleanly
- [ ] Payments: server-side amount, signature + fetch verification, webhook, idempotent
- [ ] Uploads: type/size validated, object storage, private docs behind auth
- [ ] gunicorn, pinned requirements, health check
- [ ] Frontend: `npm run build` and `npm run lint` pass; no `localhost` in `src/` (`grep -rn "127.0.0.1\|localhost" src` returns nothing outside `endpoints.js` DEV fallback)
- [ ] `vercel.json` rewrite; session survives refresh
- [ ] No hardcoded hospital, department or stat data; no `"Zydus"` string in `src/`
- [ ] Each role tested end-to-end on the deployed URL (see 6.2)
- [ ] `mongodump` backup taken

---

## Phase 6: Hardening ✅

### 6.1 Tests (minimum)
- Backend: `pytest` + `mongomock` (or a test Atlas DB). Test **permissions** for every endpoint × role (a table-driven test: role → expected status), plus booking, prescription, order and payment flows.
- Frontend: a smoke test of each page rendering against a mocked API (Vitest + MSW). Optionally Playwright for login → book → prescribe.
- CI (GitHub Actions): backend lint (`ruff`) + tests, frontend lint + build, on every PR.

### 6.2 End-to-end acceptance script (run on the deployed URL)
1. SuperAdmin logs in → creates a hospital + Admin.
2. Admin logs in → creates departments → approves a doctor who signed up.
3. Supplier signs up → adds a product → Admin approves it → Admin orders stock → Supplier fulfils → Admin pays → stock increases.
4. Patient signs up (OTP email arrives) → books with a real doctor/slot → pays.
5. Doctor sees the appointment → approves → writes a prescription with stocked medicines → stock decreases.
6. Patient sees appointment **history** + prescription; Doctor/Admin see the patient's full history.
7. Refresh on every page → still logged in. Wrong role URL → redirected. Hit login 6× fast → 429.

---

## Phase 7: AI chatbot (after the stable release) 🤖

Do this **only after Phases 0–5 are done**. A chatbot on top of broken permissions would leak patient data.

Suggested design:
- **Backend-only LLM calls.** Add `apps/assistant/` with `POST /api/assistant/chat/` (JWT, throttled e.g. `20/min`, streaming response). The API key stays on the server and never reaches the frontend.
- **Use the latest Claude model** via the Anthropic SDK (`anthropic` Python package), with **tool use**. The model calls *your existing service functions* (`get_my_appointments`, `list_doctors(department)`, `get_available_slots`, `book_appointment`, …) **with the logged-in user's identity**, so it can never see more than the user could. Reuse the same permission and scoping helpers from Phase 1.
- **Scope per role:**
  - Patient: find a doctor, book or cancel, explain a prescription (no diagnosis), FAQs.
  - Doctor: summarise a patient's history.
  - Admin: "what's low in stock?"
- **Safety:**
  - Add a medical disclaimer and refuse diagnosis or dosing advice.
  - Make the model ask for confirmation before any write action.
  - Log conversations (without PII where possible).
  - Set a max token and cost budget per user per day.
- **Knowledge base:** move `Disease.jsx` content, FAQs and hospital info into Mongo (`kb_articles`). Use Atlas Vector Search for retrieval-augmented answers.
- **Frontend:** a floating `<ChatWidget>` that uses the same `apiClient`.

---

## Appendix A: Current API map (after restructure)

| Prefix | Endpoints |
|---|---|
| `/api/accounts/` | `register/`, `verify-email/`, `login/`, `logout/`, `verify/`, `profile/me/`, `profile/me/update/`, `get_company_name/<email>/` |
| `/api/users/` | `doctors/search/`, `doctors/approve/`, `doctors/reject/`, `doctors/<hospital>/`, `doctors/<hospital>/pending/`, `doctors/<hospital>/department/<dept>/`, `doctors/<id>/role/`, `doctors/<id>/` ⚠️ unreachable, `patients/search/`, `patients/<hospital>/`, `patients/<hospital>/department/<dept>/`, `patients/<id>/` ⚠️ unreachable |
| `/api/appointments/` | `book/`, `approve/<id>/`, `my/`, `pending/`, `all/`, `save-prescription/`, `prescriptions/pending|my|all/`, `get-hospital-medicines/[<hospital>/]` |
| `/api/hospitals/` | `''` (GET list / POST create), `<id>/update/`, `<id>/` (DELETE), `<id>/departments/`, `<id>/departments/<dept_id>/update/`, `<id>/departments/<dept_id>/` |
| `/api/orders/` | `products/`, `products/create/`, `products/unapproved/`, `products/approve/<id>/`, `orders/`, `orders/create/`, `orders/fulfill/<id>/`, `orders/complete/<id>/`, `supplier-products/`, `supplier-orders/` |
| `/api/payments/` | `razorpay/order/`, `razorpay/verify/` ⚠️ both unusable (no JWT auth) |

## Appendix B: Suggested target folder structure

```
Backend/
  backend/            settings/ (base.py, dev.py, prod.py), urls.py, wsgi.py, exceptions.py, pagination.py
  core/               db.py (Mongo client + indexes), roles.py, permissions.py, utils (time, ids)
  apps/
    accounts/         auth, OTP, sessions, profile
    users/            doctors, patients (admin views)
    hospitals/        hospitals, departments
    appointments/     appointments, prescriptions, history
    orders/           products, stock orders
    payments/         razorpay order/verify/webhook, invoices
    notifications/    list/read
    reports/          dashboard aggregations
    assistant/        (Phase 7)
  scripts/            seed.py, create_superadmin.py, backup.sh
  tests/
  Dockerfile, requirements.txt (pinned), .env.example

frontend/
  src/
    services/         apiClient.js (+ interceptors), endpoints.js, *Service.js   ← ONLY place that calls axios
    context/          AuthContext.jsx (refresh-on-load)
    constants/        roles.js
    hooks/            useApi.js (loading/error/data), useAuth
    components/       ui/, layout/, AsyncState.jsx, ChatWidget.jsx (later)
    pages/<Role>/...
    routes/           Routers.jsx
  vercel.json, .env.example
```

---

*Generated from a read-only audit. Line numbers refer to the code as of 2026-11-01 on branch `NewFrontend` with uncommitted changes, and will drift as you fix things.*
