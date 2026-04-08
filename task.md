# PrintSpot Kiosk: Final Execution Checklist (task.md)

This document tracks the progress of the Modern Frontend Migration, Feature Implementation (Multi-PDF, Mixed Color), and Backend Hardening.

---

## Phase 1: Preparation & Migration Audit
- [x] **Audit Old Frontend:** Cross-reference `frontend/src` with `modern/src` to identify all functional gaps.
- [x] **State Comparison:** Verify that all unique login/order/selection logic from the old frontend is ported.
- [x] **Route Setup:** Ensure all essential pages (Upload, Review, Payment, Success, Error) exist in `modern/src/pages`.

## Phase 2: Modern UI - Multi-File & Review Overhaul
- [x] **Multi-Uploader:** Configure uploader to accept multiple files (Array state).
- [x] **Global Size Validator:** Add a middleware/helper to block uploads if `(Current Files + New Files) > 50MB`.
- [x] **Horizontal Cards UI:** Implement a horizontally scrollable container in the Review tab for per-file settings.
- [x] **Per-File Settings Panel:**
    - [x] Dropdown for Paper Size: `A4`, `A3`, `Letter`.
    - [x] Toggle for `Duplex` (Double-sided).
    - [x] Advanced Color Selection ("Print specific pages in Color").
- [x] **Lazy-Loaded Previews:** Optimize the Review tab to handle numerous PDFs without memory bloating.

## Phase 3: Backend Logic - PDF Splitting & Routing
- [x] **Fix Hardcoded Defaults:** Update `print_engine.py` to accept dynamic `paper_size` from the request.
- [x] **PDF Manipulator Integration:** Add `PyPDF2` or `pikepdf` dependency to `kiosk-server`.
- [x] **Mixed Color Logic:**
    - [x] Create logic to extract specified pages into `temp_color.pdf`.
    - [x] Create logic to extract remaining pages into `temp_bw.pdf`.
- [x] **Multi-Printer Queue:**
    - [x] Dispatch `temp_color.pdf` to `PRINTER_COLOR`.
    - [x] Dispatch `temp_bw.pdf` to `PRINTER_BW`.
- [x] **Robust CLI Detection:** Check `.env` for SumatraPDF path and fall back to system `PATH` if not found.

## Phase 4: Admin Dashboard & Data Syncing
- [x] **Admin API Connection:** Replaced all mock values in `modern` with `fetch` calls to `admin-backend`.
- [x] **Live Kiosk Feed:** Show real-time paper/ink levels and printer connectivity.
- [x] **Order Monitoring:** Real-time view of orders being processed across all kiosks.

## Phase 5: Advanced Print Controls & Pricing Engine Sync
- [x] **Pricing Formula Sync:**
    - [x] Fetch cost multipliers for `A4`, `A3`, `Letter`.
    - [x] Fetch cost per `Color` vs `B&W` page from Supabase.
- [x] **Advanced Page Selectors:**
    - [x] Implement "All", "Odd", "Even", and "Custom Range" selection.
- [x] **Double-Sided Logic:** Special pricing logic for Duplex prints (sheet-based vs page-based).

## Phase 6: Kiosk Hardening & Reliability (Bug Fixes)
- [ ] **Session Auto-Reset:** Implement a 60s idle timeout to clear sensitive user data and files.
- [ ] **Process Progress bars:** Add visual feedback during the "Splitting PDF" and "Sending to Printer" phases.
- [ ] **Subprocess Handler:** Update `print_engine.py` to handle concurrent spooling without blocking the main event loop.
- [ ] **Maintenance Mode:** Implement an overlay if any of the 4 printers report "Offline" via `printer_status.py`.

## Phase 7: Remote & Local Kiosk Power Management
- [ ] **Windows Shutdown Utility:** Create a secure utility in `kiosk-server` to execute a clean system shutdown (`shutdown /s /f /t 10`).
- [ ] **Admin Remote Trigger:**
    - [ ] Add a "Power" tab/button in the Admin Dashboard to send shutdown signals.
    - [ ] Implement a protected endpoint in `admin-backend` to broadcast the shutdown command via Supabase Realtime or WebSockets.
- [ ] **Hidden Operator Menu (Kiosk UI):**
    - [ ] Implement a hidden trigger gesture (e.g., 5-tap sequence or 3s long-press on the PrintSpot logo).
    - [ ] Design a minimalist PIN-entry overlay for operator authentication.
- [ ] **Local Admin Controls:**
    - [ ] Add "Shutdown Machine" and "Restart Kiosk App" buttons within the hidden menu specifically for on-site maintenance.
    - [ ] Add a safety confirmation modal to prevent accidental shutdowns.

---

## Status Key
- 🟢 Complete
- 🟡 In Progress
- ⚪ Not Started
- 🔴 Blocked
