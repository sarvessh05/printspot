# Print Spot Kiosk System Tasks

## Phase 1: Kiosk Decoupling & Local Hosting
- [ ] **Extract Kiosk Frontend**: Move `KioskPage.tsx` logic into a separate, lightweight local frontend application.
- [ ] **Local Deployment**: Configure the kiosk PC to host this page locally (e.g., using a local web server or as a standalone electron/webview app).
- [ ] **PIN Entry Logic**: Optimize the PIN entry system for touch screen interaction.

## Phase 2: New Admin Infrastructure
- [ ] **Subdomain Setup**: Deploy the admin dashboard to `admin.theprintspot.in`.
- [ ] **Kiosk Monitoring**:
    - [ ] Real-time status tracking (Active/Inactive).
    - [ ] Heartbeat system between `kiosk-server` and Admin Backend.
- [ ] **Analytics Dashboard**:
    - [ ] Track total print jobs done per kiosk.
    - [ ] Monitor paper/toner levels (if supported by hardware).
    - [ ] Revenue tracking.

## Phase 3: Remote Management & OS Hardening
- [ ] **Remote Commands**:
    - [ ] Implement Remote Restart functionality.
    - [ ] Implement Remote Shutdown functionality.
- [ ] **Kiosk Shell Implementation**:
    - [ ] Set up Windows to boot directly into the Kiosk application (Shell replacement).
    - [ ] Disable Windows hotkeys, taskbar, and desktop access for end users.
    - [ ] Ensure `kiosk-server` starts silently in the background on boot.

## Phase 4: UI/UX Refinement
- [ ] **Theme Update**: Switch Kiosk interface from Dark Mode to Light Mode for better visibility in physical kiosk environments.
- [ ] **Touch Optimization**: Increase size of numeric inputs and buttons for reliable touch interaction.
