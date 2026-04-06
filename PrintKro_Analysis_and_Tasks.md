# PrintKro — Master Task List
**Last Updated:** 2026-04-05  
**Status:** In Progress

---

## ARCHITECTURE (Finalized)

```
┌──────────────────────────────────────────────────────────────────────┐
│                        CUSTOMER FLOW                                 │
│                                                                      │
│  Customer Phone                                                       │
│  React + Vite (Vercel)                                               │
│  Landing → Upload → Review → Pay (Razorpay) → OTP → Success         │
└─────────────────────────────┬────────────────────────────────────────┘
                              │ Supabase
                              ▼
                ┌─────────────────────────┐
                │  Supabase               │
                │  - Storage (PDFs)       │
                │  - DB: print_orders     │
                │  - DB: kiosks           │ ◄── NEW
                │  - DB: kiosk_health     │ ◄── NEW
                └────────────┬────────────┘
                             │
          ┌──────────────────┼──────────────────┐
          ▼                  ▼                  ▼
  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐
  │ Kiosk #1     │   │ Kiosk #2     │   │ Kiosk #N     │
  │ Windows PC   │   │ Windows PC   │   │ Windows PC   │
  │ Python 5000  │   │ Python 5000  │   │ Python 5000  │
  │ HP Printer   │   │ HP Printer   │   │ HP Printer   │
  └──────────────┘   └──────────────┘   └──────────────┘
                             │
                             │ Reports to
                             ▼
              ┌──────────────────────────┐
              │  Admin Dashboard         │ ◄── NEW (Python FastAPI)
              │  Python FastAPI (Cloud)  │
              │  Multi-kiosk analytics   │
              │  Individual machine view │
              └──────────────────────────┘
```

### Tech Stack (Locked)

| Layer | Technology | Reason |
|-------|-----------|--------|
| Customer Web | React + Vite (existing, keep) | Working, just needs bug fixes |
| Kiosk Local Server | Python + FastAPI | Replaces Node.js server.js |
| Admin Dashboard Backend | Python + FastAPI | New, cloud-hosted |
| Admin Dashboard Frontend | React + Vite (new project) | Separate from customer frontend |
| Database | Supabase (existing) | Add new tables |
| File Storage | Supabase Storage (existing) | No change |
| Payment | Razorpay (existing) | Move verification server-side |
| Print Protocol | SNMP + SumatraPDF CLI | SNMP for status, SumatraPDF for print |

---

## DATABASE CHANGES (Supabase)

### Existing Table: `print_orders`
No structural changes. Add `kiosk_id` column to track which machine printed it.

| Column | Type | Change |
|--------|------|--------|
| kiosk_id | text | ADD — which kiosk fulfilled the order |

### New Table: `kiosks`
Master registry of all kiosk machines.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | Primary key |
| kiosk_id | text | Unique machine ID e.g. KIOSK_PUNE_001 |
| name | text | Human name e.g. "The Print Spot - Pune" |
| location | text | Physical address |
| token | text | Secret auth token for each kiosk |
| is_active | bool | Is this machine active |
| created_at | timestamp | Auto |

### New Table: `kiosk_health`
Time-series health snapshots sent by each kiosk.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | Primary key |
| kiosk_id | text | FK to kiosks.kiosk_id |
| paper_remaining | int | Current paper count |
| ink_remaining | int | Current ink count |
| printer_status | text | NORMAL / JAMMED / OFFLINE |
| timestamp | timestamp | When this snapshot was taken |

---

## PHASE 1 — Database Schema Updates
**Goal:** Add new Supabase tables and update existing ones.  
**Where:** Supabase SQL editor

- [x] **1.1** Add `kiosk_id` column to existing `print_orders` table
  ```sql
  ALTER TABLE print_orders ADD COLUMN kiosk_id TEXT DEFAULT 'KIOSK_PUNE_001';
  ```

- [x] **1.2** Create `kiosks` table
  ```sql
  CREATE TABLE kiosks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    kiosk_id TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    location TEXT,
    token TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
  );
  ```

- [x] **1.3** Insert first kiosk record
  ```sql
  INSERT INTO kiosks (kiosk_id, name, location, token)
  VALUES ('KIOSK_PUNE_001', 'The Print Spot - Pune', 'Pune, Maharashtra',
          'printspot_super_secret_123');
  ```

- [x] **1.4** Create `kiosk_health` table
  ```sql
  CREATE TABLE kiosk_health (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    kiosk_id TEXT NOT NULL,
    paper_remaining INT NOT NULL,
    ink_remaining INT NOT NULL,
    printer_status TEXT NOT NULL DEFAULT 'NORMAL',
    timestamp TIMESTAMPTZ DEFAULT now()
  );
  CREATE INDEX idx_kiosk_health_kiosk_id ON kiosk_health(kiosk_id);
  CREATE INDEX idx_kiosk_health_timestamp ON kiosk_health(timestamp DESC);
  ```

- [x] **1.5** Set Supabase Row Level Security (RLS) policies for new tables — allow service_role full access, disable public access

---

## PHASE 2 — Frontend Bug Fixes (React + Vite)
**Goal:** Fix the known breaking bugs in the existing customer frontend.  
**Files:** `frontend/src/pages/`  
**Note:** No new features. Only fix what's broken.

- [ ] **2.1** `KioskPage.jsx` — Remove all dead commented code (lines 1–399). Keep only the live implementation.

- [ ] **2.2** `KioskPage.jsx` — Fix `verifyAndPrintOtp()` function:
  - Query Supabase for pending order by OTP — get the full record including `id`, `file_url`, `total_pages`
  - Build the correct array payload for POST `/print`:
    ```js
    [{ db_id: data.id, otp: data.otp, downloadUrl: data.file_url,
       copies: data.copies, mode: data.mode, isTwoSided: data.is_two_sided,
       printRange: data.print_range, totalPages: data.total_pages }]
    ```

- [ ] **2.3** `KioskPage.jsx` — Fix success polling:
  - Server returns `'NORMAL'` when printer is healthy
  - After `printing_physical` state, if polling gets `'NORMAL'` treat as success (not `'CLEAR'`)
  - Update polling condition: `if (data.status === 'NORMAL') { setStatus("success") ... }`

- [ ] **2.4** `App.jsx` — Register `/kiosk` route pointing to `KioskPage`

- [ ] **2.5** `ReviewPage.jsx` — Update payment flow to call new Python backend's `/api/create-order` endpoint AFTER payment succeeds (OTP will be generated server-side, not in browser using Math.random)
  - This task depends on Phase 5 (Admin Backend) being built first
  - For now, add a TODO comment on line 130

- [ ] **2.6** Remove the old `Dashboard.jsx` component from routes — it will be replaced by the new standalone Admin Dashboard (Phase 6)
  - OR keep it as a local operator panel (simpler on-site view) — mark `/admin` route as "operator view"

- [ ] **2.7** Test full customer flow manually in browser after fixes:
  - Upload → Review → (skip payment, mock) → Success page shows OTP
  - Kiosk page → enter OTP → payload sent correctly

---

## PHASE 3 — Python Kiosk Server: Scaffold
**Goal:** Create the project structure and base configuration.  
**Where:** `kiosk-server/` (replaces server.js)

- [x] **3.1** Create `kiosk-server/requirements.txt`:
  ```
  fastapi==0.115.0
  uvicorn[standard]==0.30.0
  httpx==0.27.0
  python-dotenv==1.0.1
  pysnmp-lextudio==6.2.4
  pywin32==306
  aiofiles==23.2.1
  pydantic==2.7.0
  supabase==2.4.0
  ```

- [x] **3.2** Create `kiosk-server/config.py` — load all env vars:
  ```python
  PRINTER_IP, ADMIN_PASSWORD, VITE_KIOSK_ID, VITE_KIOSK_TOKEN,
  ADMIN_BACKEND_URL, SUPABASE_URL, SUPABASE_SERVICE_KEY
  ```

- [x] **3.3** Create `kiosk-server/state.py` — thread-safe JSON state:
  - `get_kiosk_state() -> dict` — reads `kiosk_state.json`
  - `save_kiosk_state(state: dict)` — writes `kiosk_state.json`
  - Initial state: `{ "paper": 500, "ink": 6000 }`

- [x] **3.4** Create `kiosk-server/server.py` — FastAPI app:
  - CORS middleware (allow all origins for local dev)
  - Include routers from routes/
  - Lifespan context for background tasks
  - Serve `dist/` as static files
  - Catch-all route → `dist/index.html`
  - Start on port 5000

- [x] **3.5** Create `kiosk-server/run_server.bat` ✅
- [x] **3.6** Create `kiosk-server/models/print_job.py` ✅
- [x] **3.7** **Environment Consolidation:** Root `.env` and `.env.example` created ✅

---

## PHASE 4 — Python Kiosk Server: Utility Modules (Hardening)
**Goal:** Port hardware and communication logic from Node.js to Python.  
**Where:** `kiosk-server/utils/`

- [x] **4.1** Create `utils/logger.py` — Rotating file logs ✅
- [x] **4.2** Create `utils/printer_status.py` — **Dual-Mode** (USB + IP Fallback) ✅
- [x] **4.3** Create `utils/print_engine.py` — SumatraPDF Automation ✅
- [x] **4.4** Create `utils/notifications.py` — Telegram Integration ✅
- [x] **4.5** Create `utils/cloud_client.py` — Health & Heartbeats ✅
- [x] **4.6** Create `utils/file_downloader.py` — Async PDF retrieval ✅

---

## PHASE 5 — Python Kiosk Server: Core Routes
**Goal:** Port and fix the primary print engine and admin routes.  
**Where:** `kiosk-server/routes/`

- [ ] **5.1** Create `routes/print_route.py` — `POST /print`:
  - Accept `List[PrintJob]` in request body
  - **Pre-flight checks:**
    - Calculate total pages needed = sum(job.totalPages * job.copies)
    - Check `state.paper >= required` else revert + return 400 `OUT_OF_PAPER`
    - Check `state.ink >= required` else revert + return 400 `OUT_OF_INK`
    - `await check_printer_ping(PRINTER_IP)` → if False, revert + return 400 `MACHINE_OFFLINE`
    - `await check_printer_snmp(PRINTER_IP)` → if code==5, revert + return 400 `MACHINE_JAMMED`
  - **Per-job execution:**
    - Download file to temp path
    - Build print options (printer name, copies, page range)
    - `await send_to_printer(file_path, options)`
    - Delete temp file
    - `await report_print_complete(job.db_id, ...)`
  - **Post-execution:**
    - Deduct paper/ink from state, save state
    - Return 200 `{ success: true }`
  - **On any exception:**
    - `await report_print_failed(...)` for all jobs
    - Return 500 `MACHINE_ERROR`

- [ ] **5.2** Create `routes/printer_status_route.py`:
  - `GET /api/printer-status` → returns `{ "status": global_printer_status }`
  - `GET /admin/reset-jam` → sets `global_printer_status = "NORMAL"`, return 200

- [ ] **5.3** Create `routes/admin_route.py`:
  - `POST /admin/reset` — body: `{ password, paper, ink }`
    - Check `password == ADMIN_PASSWORD` else 401
    - If `paper == True`: `state["paper"] = 500`
    - If `ink == True`: `state["ink"] = 6000`
    - Save state, call `report_health_snapshot`
    - Return `{ success: true, state }`
  - `POST /admin/shutdown` — body: `{ password }`
    - Check password
    - Run `subprocess.Popen(["shutdown", "/s", "/t", "0"])`
    - Return 200 then exit
  - `GET /status` — returns `{ state, printer_status }` (for dashboard compatibility)

---

## PHASE 6 — Python Kiosk Server: Background Watchman
**Goal:** Port the 3-second background monitoring loop.  
**Where:** `kiosk-server/background/watchman.py`

- [ ] **6.1** Create `background/watchman.py`:
  ```python
  global_printer_status: str = "NORMAL"
  
  async def watchman_loop():
      while True:
          await asyncio.sleep(3)
          # SNMP check
          # PowerShell queue check
          # Update global_printer_status
  ```
  - SNMP check → code==5: `global_printer_status = "JAMMED"`
  - PowerShell check:
    ```powershell
    $jobs = Get-PrintJob -PrinterName '*HP*' -ErrorAction SilentlyContinue
    if ($jobs | Where-Object { $_.JobStatus -match 'Error|Jam|Blocked|Paused' }) { 'JAMMED' } else { 'NORMAL' }
    ```
  - Run via `asyncio.create_subprocess_shell`, capture stdout
  - If any check returns JAMMED → set `global_printer_status = "JAMMED"`
  - If all clear → set `global_printer_status = "NORMAL"`

- [ ] **6.2** Register watchman in `server.py` lifespan:
  ```python
  @asynccontextmanager
  async def lifespan(app: FastAPI):
      task = asyncio.create_task(watchman_loop())
      yield
      task.cancel()
  ```

- [x] **6.3** Add health heartbeat inside watchman loop (every 30 seconds): ✅
  - Call `report_health_snapshot(kiosk_id, token, paper, ink, status)`
  - This will keep the admin dashboard updated in near-real-time

---

## PHASE 7 — Admin Dashboard Backend (Python FastAPI — Cloud)
**Goal:** Build the centralized admin backend that aggregates data from all kiosks.  
**Where:** NEW folder `admin-backend/` at project root  
**Deploy:** Cloud (Render / Railway / EC2 / VPS)

### Project Setup

- [ ] **7.1** Create `admin-backend/` folder with:
  - `requirements.txt`: `fastapi`, `uvicorn`, `supabase`, `python-dotenv`, `httpx`, `pydantic`
  - `.env`: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `ADMIN_MASTER_PASSWORD`
  - `server.py` — FastAPI app on port 8080
  - `config.py` — env loader

### Kiosk Reporting Endpoints (called by each Python kiosk)

- [ ] **7.2** `POST /api/kiosk/report-health` — kiosk sends heartbeat:
  - Body: `{ kiosk_id, kiosk_token, paper, ink, printer_status }`
  - Verify kiosk_token against `kiosks` table
  - Insert row to `kiosk_health` table
  - Return `{ ok: true }`

- [ ] **7.3** `POST /api/kiosk/report-complete` — kiosk signals job done:
  - Body: `{ db_id, kiosk_id, kiosk_token, paper_remaining, ink_remaining }`
  - Verify token
  - Update `print_orders` set `print_status='completed'`, `kiosk_id=kiosk_id` where `id=db_id`
  - Insert health snapshot
  - Return `{ ok: true }`

- [ ] **7.4** `POST /api/kiosk/report-failed` — kiosk signals job failed:
  - Body: `{ db_id, kiosk_id, kiosk_token }`
  - Verify token
  - Update `print_orders` set `print_status='pending'` where `id=db_id` (revert OTP)
  - Return `{ ok: true }`

### Analytics Endpoints (called by Admin Dashboard UI)

- [ ] **7.5** `GET /api/admin/overview` — global stats:
  - Requires master auth header
  - Returns:
    ```json
    {
      "total_revenue_today": 1500,
      "total_orders_today": 45,
      "total_revenue_alltime": 85000,
      "active_kiosks": 2,
      "total_kiosks": 3
    }
    ```
  - Query: COUNT and SUM from `print_orders` where `print_status='completed'`

- [ ] **7.6** `GET /api/admin/kiosks` — list all machines with live status:
  - Returns array of kiosk objects with latest health snapshot joined
  - Each object: `{ kiosk_id, name, location, paper, ink, printer_status, last_seen, revenue_today, orders_today }`

- [ ] **7.7** `GET /api/admin/kiosk/{kiosk_id}` — individual machine deep dive:
  - Returns:
    - Kiosk info
    - Revenue by day (last 30 days)
    - Orders by mode (bw vs color)
    - Paper/ink history (last 24 hours from kiosk_health)
    - Recent 20 orders for this machine

- [ ] **7.8** `GET /api/admin/orders` — paginated orders across all machines:
  - Query params: `kiosk_id`, `date_from`, `date_to`, `status`, `page`, `limit`
  - Returns paginated list with total count

- [ ] **7.9** `POST /api/admin/kiosks/add` — register new kiosk:
  - Body: `{ kiosk_id, name, location, token }`
  - Requires master auth
  - Insert to `kiosks` table

- [ ] **7.10** Auth middleware:
  - All `/api/admin/*` endpoints require header: `X-Admin-Password: <ADMIN_MASTER_PASSWORD>`
  - Return 401 if missing or wrong

---

## PHASE 8 — Admin Dashboard Frontend (React + Vite — New)
**Goal:** Build the scalable admin UI showing multi-kiosk analytics.  
**Where:** NEW folder `admin-frontend/` at project root

### Setup

- [ ] **8.1** Scaffold with Vite + React:
  ```bash
  npm create vite@latest admin-frontend -- --template react
  ```
  Install: `axios`, `react-router-dom`, `lucide-react`, `recharts` (for charts)

- [ ] **8.2** Create `.env` in `admin-frontend/`:
  ```
  VITE_ADMIN_BACKEND_URL=http://your-backend-url:8080
  VITE_ADMIN_PASSWORD=your_password
  ```

### Pages

- [ ] **8.3** `LoginPage.jsx` — password entry:
  - Input for master password
  - Store in sessionStorage on success
  - Redirect to `/dashboard`

- [ ] **8.4** `OverviewPage.jsx` — the main landing after login:
  - Top stat cards: Total Revenue Today, Orders Today, Active Kiosks, All-time Revenue
  - Grid of kiosk cards — one per machine, showing:
    - Kiosk name + location
    - Live status dot (green/red/yellow)
    - Paper level progress bar
    - Ink level progress bar
    - Today's revenue
    - "View Details" button → `/kiosk/<kiosk_id>`
  - Auto-refresh every 30 seconds
  - "Add New Kiosk" button → modal

- [ ] **8.5** `KioskDetailPage.jsx` — individual machine analytics:
  - Header: Name, Location, Kiosk ID, Live status
  - Stats row: Today's revenue, orders count, paper %, ink %
  - Revenue chart (line chart) — last 30 days using recharts
  - Orders by mode chart (bar/pie) — B&W vs Color
  - Paper/Ink history chart (last 24h snapshots)
  - Recent orders table (last 20)
  - Admin actions panel:
    - Reset Jam button
    - Remote shutdown button (requires confirmation)

- [ ] **8.6** `OrdersPage.jsx` — all orders across all machines:
  - Filter by: kiosk, date range, status (pending/completed)
  - Paginated table: Time, OTP, Kiosk, File, Pages, Mode, Amount, Status
  - Export to CSV button

- [ ] **8.7** Add Kiosk Modal (in `OverviewPage.jsx`):
  - Form: Kiosk ID, Name, Location, Token
  - Submit → POST `/api/admin/kiosks/add`

- [ ] **8.8** Auth guard:
  - Higher-order component checks `sessionStorage` for password
  - Redirect to `/` if not authenticated

- [ ] **8.9** Design system:
  - Dark mode admin aesthetic (dark navy background, accent green for positive, accent red for alerts)
  - Use Tailwind CSS (appropriate for admin tools)
  - Responsive: desktop first but works on tablet

---

## PHASE 9 — Security Hardening
**Goal:** Fix the critical security holes in the payment and OTP flow.

- [ ] **9.1** Add `POST /api/create-order` to Admin Backend:
  - Body: `{ razorpay_payment_id, razorpay_order_id, razorpay_signature, file_name, file_url, unique_name, copies, mode, is_two_sided, print_range, total_pages, total_amount }`
  - HMAC-SHA256 verify: `signature = HMAC(key=RAZORPAY_KEY_SECRET, msg="{order_id}|{payment_id}")`
  - If valid: generate OTP using `secrets.randbelow(900000) + 100000`
  - Insert to Supabase `print_orders`
  - Return `{ otp: "123456" }`

- [ ] **9.2** Update `ReviewPage.jsx` (frontend):
  - After Razorpay `handler` fires (payment success callback):
  - Call `POST /api/create-order` with payment IDs + order data
  - Use returned OTP to navigate to SuccessPage
  - Remove `Math.random()` OTP generation from browser

- [ ] **9.3** Add Razorpay Order creation on backend:
  - `POST /api/create-razorpay-order` — called before Razorpay popup opens
  - Backend creates Razorpay order using API, returns `order_id`
  - Frontend passes this `order_id` to Razorpay popup
  - This enables proper signature verification in 9.1

---

## PHASE 10 — Integration Testing
**Goal:** Verify the entire flow works end to end.

- [ ] **10.1** Test Customer Flow:
  - Upload PDF → select settings → pay (test mode) → verify OTP generated server-side → success page shows OTP

- [ ] **10.2** Test Kiosk Flow:
  - Open kiosk page → enter OTP → verify Python server receives correct payload → file downloads → print dispatch works → status updates to completed in DB

- [ ] **10.3** Test Admin Dashboard:
  - Login → overview shows kiosk cards → kiosk heartbeat updates stats → revenue shows correctly

- [ ] **10.4** Test Failure Scenarios:
  - Out of paper → kiosk shows "OUT_OF_PAPER" and OTP stays usable (reverted)
  - Printer offline → kiosk shows "MACHINE_OFFLINE" and OTP reverted
  - Paper jam detected by SNMP → watchman sets JAMMED → kiosk shows locked state
  - Invalid OTP → "Invalid OTP" error, auto-reset after 5 seconds

- [ ] **10.5** Test Scalability:
  - Add Kiosk #2 via admin panel
  - Both kiosks send heartbeats
  - Admin overview shows both kiosk cards independently

---

## PHASE 11 — Deployment & Packaging

### Kiosk Machine (each Windows PC)

- [ ] **11.1** Install Python 3.11 on kiosk machine
- [ ] **11.2** Install SumatraPDF and add to system PATH
- [ ] **11.3** Install dependencies: `pip install -r requirements.txt`
- [ ] **11.4** Set up `.env` with machine-specific `VITE_KIOSK_ID` and token
- [ ] **11.5** Build React frontend: `npm run build` in `frontend/`, copy `dist/` to `kiosk-server/dist/`
- [ ] **11.6** Create Windows startup task: run `run_server.bat` on system boot
- [ ] **11.7** (Optional) Create PyInstaller bundle for zero-Python-install deployment:
  - `pyinstaller kiosk_server.spec`
  - Test the `.exe` output on a clean Windows machine

### Admin Backend (Cloud)

- [ ] **11.8** Deploy `admin-backend/` to Render / Railway (free tier works):
  - Set env vars in cloud provider dashboard
  - Confirm public URL is accessible
  - Update `.env` in all kiosk machines with `ADMIN_BACKEND_URL`

### Admin Frontend (Cloud)

- [ ] **11.9** Build React admin dashboard: `npm run build` in `admin-frontend/`
- [ ] **11.10** Deploy to Vercel or Netlify
- [ ] **11.11** Set `VITE_ADMIN_BACKEND_URL` env var in Vercel dashboard

---

## FINAL DIRECTORY STRUCTURE

```
PrintKro_Kiosk/
│
├── frontend/                    # Customer-facing React app (Vercel)
│   └── src/pages/
│       ├── LandingPage.jsx      ✅ Working
│       ├── UploadPage.jsx       ✅ Working
│       ├── ReviewPage.jsx       🔧 Fix Phase 2.5, 9.2
│       ├── SuccessPage.jsx      ✅ Working
│       ├── KioskPage.jsx        🔧 Fix Phase 2.1–2.3
│       └── Dashboard.jsx        🗑️ Remove/repurpose Phase 2.6
│
├── kiosk-server/                # Per-machine Python server
│   ├── server.py                🆕 Phase 3
│   ├── config.py                🆕 Phase 3
│   ├── state.py                 🆕 Phase 3
│   ├── requirements.txt         🆕 Phase 3
│   ├── run_server.bat           🆕 Phase 3
│   ├── kiosk_state.json         (existing)
│   ├── models/
│   │   └── print_job.py         🆕 Phase 3
│   ├── routes/
│   │   ├── print_route.py       🆕 Phase 5
│   │   ├── printer_status_route.py 🆕 Phase 5
│   │   └── admin_route.py       🆕 Phase 5
│   ├── utils/
│   │   ├── printer_ping.py      🆕 Phase 4
│   │   ├── printer_snmp.py      🆕 Phase 4
│   │   ├── windows_printer.py   🆕 Phase 4
│   │   ├── file_downloader.py   🆕 Phase 4
│   │   └── admin_reporter.py    🆕 Phase 4
│   ├── background/
│   │   └── watchman.py          🆕 Phase 6
│   └── dist/                    (React build copied here)
│
├── admin-backend/               🆕 Phase 7 (Cloud FastAPI)
│   ├── server.py
│   ├── config.py
│   ├── requirements.txt
│   └── routes/
│       ├── kiosk_reporting.py
│       ├── analytics.py
│       └── auth.py
│
└── admin-frontend/              🆕 Phase 8 (Vercel)
    └── src/pages/
        ├── LoginPage.jsx
        ├── OverviewPage.jsx
        ├── KioskDetailPage.jsx
        └── OrdersPage.jsx
```

---

## TASK PRIORITY ORDER

```
Phase 1  (DB schema)       → Foundation. Do first.
Phase 2  (Frontend fixes)  → Unblocks kiosk testing.
Phase 3  (Python scaffold) → Required for all Python work.
Phase 4  (Utils)           → Required before routes.
Phase 5  (Core routes)     → The print engine. Most critical.
Phase 6  (Watchman)        → Background monitoring.
Phase 7  (Admin backend)   → Cloud reporting center.
Phase 8  (Admin frontend)  → The dashboard UI.
Phase 9  (Security)        → Do after flow is working.
Phase 10 (Testing)         → End-to-end validation.
Phase 11 (Deployment)      → Production rollout.
```

---

## PROGRESS TRACKER

| Phase | Description | Status |
|-------|-------------|--------|
| 1 | Database Schema | ✅ Completed |
| 2 | Frontend Bug Fixes | ⬜ Not Started |
| 3 | Python Kiosk Scaffold | ✅ Completed |
| 4 | Python Utility Modules | ✅ Completed |
| 4.4 | Telegram Integration | ✅ Completed |
| 5 | Python Core Routes | ✅ Completed |
| 6 | Python Background Watchman | ✅ Completed |
| 7 | Admin Backend (FastAPI) | ⬜ Not Started |
| 8 | Admin Frontend (React) | ⬜ Not Started |
| 9 | Security Hardening | ⬜ Not Started |
| 10 | Integration Testing | ⬜ Not Started |
| 11 | Deployment & Packaging | ⬜ Not Started |
