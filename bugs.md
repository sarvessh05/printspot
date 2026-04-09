# Identified Bugs & Missing Features

## 1. Razorpay Integration Incomplete
**Description:**
The actual Razorpay interface was present in the old frontend (`frontend/src/pages/ReviewPage.jsx`), utilizing the Razorpay window/script (`checkout.razorpay.com/v1/checkout.js`) for the checkout process before OTP generation. In the modern frontend (`modern/src/pages/PaymentPage.tsx`), it's only a simulated payment flow.
**Impact:**
Users aren't securely making payments before generating print orders.
**Action:**
Re-implement the actual Razorpay JavaScript SDK and its exact payment handler matching the backend verification endpoints in the modern checkout flow.

## 2. Mixed Print Mode (Specific Pages Color/BW) Missing in UI
**Description:**
While the backend (`kiosk-server/routes/print_route.py` and `print_engine.py`) has logic to split PDFs into BW and Color based on specified page ranges (the `mixed` mode), the frontend UI (`ReviewPage.tsx` / `UploadPage.tsx`) forces users to choose either strict `B/W` or `Color` for the single document.
**Impact:**
Users cannot select specific pages to be printed as Color or B/W. 
**Action:**
Add a new overlay/modal in the frontend for customized pages when "Mixed Mode" or specific page printing is chosen.

## 3. Four-Printer Ping & Verification Checks 
**Description:**
The server (`kiosk-server/utils/printer_status.py`) currently resolves to `is_online: True` if *any one* of the printers is active. However, there are 4 specific printers (`BW`, `BW Duplex`, `Color`, `Color Duplex`). We need to ping each of these 4 setups specifically.
**Impact:**
If 3 printers fall offline but 1 remains online, the kiosk believes it is fully functional. Printers for specific jobs (like Color) will fail silently upon dispatch.
**Action:**
Ping all 4 printers. If any specific printer queue goes offline, trigger a Telegram notification (`notifier.send_alert`) alerting the admin about the specific printer out of the 4 that failed.

## 4. Supabase Print Failed Handling
**Description:**
The backend intercepts print hardware and network failures and correctly cancels the job, but it uses `revert_job` which simply sets `print_status` back to `pending`. While this lets the user reuse the OTP, it doesn't clearly record a failed print dispatch history if we wanted explicit failed telemetries.
**Impact:**
"Failed" state may not be explicitly marked or tracked for Kiosk analysis in Supabase if the job is just marked `pending` silently.
**Action:**
Add or verify a clear job state update pointing to explicit failure inside Supabase. Update the relevant database hook or API.

## 5. Global Size Validator (50MB Total)
**Description:** 
The implementation in `UploadPage.tsx` (`if (f.size > 50 * 1024 * 1024) continue;`) checks if each **individual** file is under 50MB. It does not validate if the sum of all uploaded files combined exceeds the 50MB limit.
**Impact:** 
Users can upload multiple large files bypassing the global ceiling constraint overall.
**Action:**
Calculate the accumulated size of existing and incoming files. If total > 50MB, show an error toast and block the current batch.

## 6. Paper Size Selection Missing
**Description:**
`task.md` lists the Paper Size dropdown (A4, A3, Letter) and dynamic pricing multipliers as "Complete". However, `ReviewPage.tsx` defaults to A4 silently and has no UI picker to choose paper size.
**Impact:**
All jobs are forced to standard pricing and the kiosk-server gets generic fallback "A4" dimensions for every print.
**Action:**
Implement the paper size dropdown in `ReviewPage.tsx` and integrate pricing multipliers (`pricing.a3_multiplier` etc.) into the `grandTotal` calculation.

## 7. Lazy-Loaded Previews Missing
**Description:**
`task.md` states "Lazy-Loaded Previews: Optimize the Review tab" as complete. However, `ReviewPage.tsx` omits visual PDF previews entirely, showing just text statistics and settings.
**Impact:**
Users cannot visually verify their documents before printing. 
**Action:**
Add a lightweight PDF preview rendering engine (e.g. `react-pdf`) with lazy loading inside the file cards.

## 8. Custom Page Range Validation Missing
**Description:**
In `ReviewPage.tsx`, the custom page range input allows users to enter page numbers that exceed the actual page count of the uploaded document (e.g., entering "10" for a 2-page document).
**Impact:**
Incorrect page selection can lead to print failures or user confusion. The pricing might also be calculated incorrectly if it relies on the user input without validation.
**Action:**
Implement strict validation for the custom page range input. Ensure that all entered numbers and ranges are within the bounds of the document's total page count. Show a validation error if out-of-bounds pages are requested.
