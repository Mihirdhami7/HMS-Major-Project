# HMS — Action Plan to a Working Demo on Vercel

Goal: every role logs in, sees clean real data, booking works end to end, no hardcoded values,
no errors, frontend + backend both deployed on Vercel. **No layout changes.** Then the project is done.

Status checked on 2026-11-13 against the live MongoDB data (`sample data/fixed` upload, all passwords `abc@123`).
Not in scope (on purpose): pagination, Redis rate limiting, Celery, tests/CI, refresh-cookie auth, AI chatbot.
The full production review stays in `PRODUCTION_READINESS.md` for later reference.

---

## What already works (verified by API test)

| Role | Works |
|---|---|
| Patient (`mihirdhami745@gmail.com`, Zydus) | login, profile, 24 appointments, prescriptions, hospitals, departments, doctors of own hospital |
| **Book → doctor approves → patient sees "approved"** | ✅ end to end |
| Doctor (`alishnarshidani586@gmail.com`, Zydus) | login, profile, appointments, pending list, prescriptions, products |
| Admin (Zydus / Iris / Agarwal) | appointments, prescriptions, 12/6/8 doctors, pending doctors, patients, products, orders |
| Supplier (`jaypanchal123@gmail.com`) | profile, 24 products, 12 orders |

---

## Done on 2026-11-13

- ✅ **Forgot password**: Login → "Forgot password?" → email → 6-digit code (10 min, 5 tries, single use) → new password. `POST /api/accounts/password-reset/request/` + `/confirm/`. With `DEBUG=1` and email not working, the code is printed in the backend log.
- ✅ **Hospital at login is a dropdown** of real hospitals (public `GET /api/hospitals/`, shows address/phone). Signup too.
- ✅ **One patient account per hospital**: same email can register at another hospital; login hospital decides all data; booking / appointments / prescriptions / profile are scoped to it; hospital cannot be edited in profile.
- ✅ **Patient pages**: `/patient` shows hospital details, payments, full prescriptions + charts; booking page = department → doctor → book + last 30 days appointments.
- ✅ 1.2 token-expiry on Windows, 1.6 public hospital list, 1.7 (by design: patient books only at login hospital), 1.10 `DEBUG` restored, SuperAdmin profile 404 (part of 1.3), doctor profile update no longer copies password hash into `staff`.
- ⚠️ Email: Gmail rejects both configured passwords → signup OTP + reset email only work after 2.1 (App Password).

## Step 1 — Backend bugs that break the demo  (small code fixes, ~1 day)

| # | Problem (what you see) | Where | Fix |
|---|---|---|---|
| 1.1 | **Doctor can't write a prescription** — medicine list is always empty, and saving needs ≥1 medicine | `apps/appointments/views.py:706` | filter `"stock": {"$gt": 0}, "is_approved": True` instead of `"quantity"` |
| ✅ 1.2 | **Login token already expired on Windows** (works in Docker/Vercel only because they run UTC) | `apps/accounts/views.py:325` (+ `backend/db.py:86,90`) | `exp = datetime.now(timezone.utc) + timedelta(hours=4)`; use `datetime.now(timezone.utc)` for OTP/session times |
| 1.3 | **SuperAdmin logs in with ANY password**, then profile = 404 and admin pages = 403 | `apps/accounts/views.py:292-349`, `:448,519,556,654` (`userType.capitalize()`), `apps/accounts/permissions.py` | delete the hardcoded email bypass (user now has a real password `abc@123`, `userType: "SuperAdmin"`); compare roles case-insensitively; let `IsAdmin` accept SuperAdmin where it should |
| 1.4 | **Payments always fail (403)** | `apps/payments/views.py:20,32,52,64,111` | add `authentication_classes = [JWTAuthentication]`; use `user.email` not `user.id`; `RAZORPAY_KEY_ID/SECRET` from `.env` (test keys). Verify should save to `payments_collection` |
| 1.5 | **Password hashes returned** in patient list / pending doctors / patient search | `apps/users/views.py:54,131,261,418,455,490,555,639` | projection `{"hpassword": 0, "password": 0, "otp": 0}` |
| ✅ 1.6 | **Login/Signup show a text box instead of hospital dropdown** — hospital list needs login | `apps/hospitals/views.py:281-284` (+ departments `:35-38`) | `GET` → `AllowAny` (return only `id, name` publicly) |
| ✅ 1.7 | **Patient picks another hospital → "Access denied"** when loading doctors | `apps/users/views.py:395-401` | decide: patients book only their own hospital → lock the hospital select in `pages/Patients/Appointments.jsx` to `user.hospitalName` (no layout change, just `disabled`) |
| 1.8 | Delete/edit doctor or patient by id never reaches its view (route order) | `apps/users/urls.py:17-29` | put `doctors/id/<doctor_id>/` and `patients/id/<patient_id>/` before the `<hospital_name>` routes (+ update `frontend/src/services/endpoints.js`) |
| 1.9 | Product approval → 500 | `apps/orders/views.py:178` | `approved_by = request.user.email` |
| ✅ 1.10 | Uploaded photos/certificates 404, `DEBUG` missing | `backend/settings.py` | `DEBUG = os.getenv("DEBUG","False") == "True"` (True locally) |

**Test after Step 1** (each role, password `abc@123`): login → every sidebar page loads → patient books →
doctor approves → doctor writes prescription with a medicine → admin sees it in Give Medicine → payment opens Razorpay test checkout.

---

## Step 2 — Remove hardcoded config (needed before deploy, ~2 hours)

| # | What | Where | Fix |
|---|---|---|---|
| 2.1 | Gmail app password + account hardcoded (and public on GitHub) | `backend/settings.py:184-185` | revoke it in Google → new **App Password** → `EMAIL_HOST_USER/PASSWORD` from `.env`. (Your current `.env` value looks like a normal password — Gmail rejects that, so signup OTP mail fails) |
| 2.2 | Fallback `SECRET_KEY`, `ALLOWED_HOSTS="*"` | `settings.py:31,36` | from env, no fallback in production |
| 2.3 | CORS only localhost | `settings.py` `CORS_ALLOWED_ORIGINS` | read a comma list from env: `CORS_ALLOWED_ORIGINS=http://localhost:5173,https://<app>.vercel.app` |
| 2.4 | Mongo host hardcoded `cluster0.sqzac…` | `settings.py:220` | build URI from `MONGO_CLUSTER` (or one `MONGO_URI`) |
| 2.5 | Frontend API URL | `frontend/src/services/endpoints.js` | already reads `VITE_API_BASE_URL` ✅ — just set it in Vercel |
| 2.6 | Leftover old `doctors` collection in Mongo | Atlas | drop it (nothing reads it) |

---

## Step 3 — Frontend check per role (fix only what's broken, no redesign, ~1 day)

Run backend + `npm run dev`, open `http://localhost:5173`, go through every page per role and note errors / blank fields.
Already known:
- 3.1 Pages whose look changed when fake widgets were removed — check they still look right: SuperAdmin Hospital, Admin Dashboard, AdminSection, DoctorAppointments, Patient Appointments.
- 3.2 Header notifications are sample data (no notifications API) — keep as is or hide the badge.
- 3.3 Home page stats/testimonials are static marketing text — fine for a demo.
- 3.4 Signup with photo/certificate upload will fail on Vercel (no disk) → make uploads optional, or later Cloudinary.

---

## Step 4 — Deploy both on Vercel (learning step, ~½ day)

Two Vercel projects from the same GitHub repo:

| | Frontend project | Backend project |
|---|---|---|
| Root Directory | `frontend` | `Backend` |
| Framework | Vite (auto) | Python / Django (WSGI) |
| Config already in repo | `frontend/vercel.json` (SPA rewrite) ✅ | add `Backend/vercel.json` routing all requests to `backend/wsgi.py`, add `.vercelignore` (`node_modules`, `media`, `venv`, `sample data`, `db.sqlite3`) |
| Env vars | `VITE_API_BASE_URL=https://<backend>.vercel.app/api` | `SECRET_KEY, DEBUG=False, ALLOWED_HOSTS=.vercel.app, CORS_ALLOWED_ORIGINS, MONGO_*, EMAIL_*, RAZORPAY_*` |

Backend-on-Vercel facts to know:
- It runs as **serverless functions**: each request may start a fresh Python process (cold start ~1–3 s), no always-on server.
- **No writable disk** → file uploads and SQLite writes don't persist (uploads → Cloudinary later; SQLite only used by unused Django apps).
- **MongoDB Atlas → Network Access → allow `0.0.0.0/0`** (Vercel IPs change); keep a strong DB password.
- Pin versions in `requirements.txt` (`pip freeze > requirements.txt`) so the build is reproducible.
- Request time limit per function — sending OTP email must finish quickly.

**Test after deploy:** repeat the Step 1 test script on the Vercel URL; refresh deep links (e.g. `/doctor/appointments`) → no 404.

---

## Step 5 — Finish

- [ ] README: live URLs, one test login per role, tech stack, how to run locally (Docker + `npm run dev`).
- [ ] `mongodump` backup of the demo data.
- [ ] Merge `NewFrontend` (+ `NewBackend`) into `main`.
- [ ] Leave the project; next project starts clean.
