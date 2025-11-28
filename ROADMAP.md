# AxeOS Live! Feature Roadmap

## Current Version: 1.4.0

### Completed Features (v1.2.0)
- [x] Dynamic hashrate gauge scaling for high-power miners (up to 10+ TH/s)
- [x] Estimated efficiency for devices that don't report expectedHashrate
- [x] Device specs database (Magic Miner, NerdAxeQ++, Canaan Nano S, BitDSK, etc.)

### Completed Features (v1.3.0)
- [x] Export Stats to CSV - Export all miner data to spreadsheet-compatible format
- [x] Backup Configuration - Save all miner configs and tuner settings to JSON
- [x] Restore from Backup - Load miner configs from a backup file
- [x] Firmware Update Checker - Check for latest AxeOS releases on GitHub
- [x] Tools Menu - Settings gear icon in header with all tools

### Completed Features (v1.4.0)
- [x] **Notifications/Alerts System**
  - [x] In-app toast notifications
  - [x] Miner offline/online alerts
  - [x] Temperature threshold warnings (ASIC and VR)
  - [x] Hashrate drop detection (configurable percentage)
  - [x] Block found celebration alerts
  - [x] Optional sound alerts
  - [x] Settings dialog with full configuration
- [x] **Power Consumption & Cost Tracking**
  - [x] Input electricity rate ($/kWh) with currency selector
  - [x] Daily cost per miner displayed in stats
  - [x] Total daily cost in global stats bar
  - [x] Efficiency metrics (J/TH) per miner
  - [x] Settings persistence

---

## Planned Features

### High Priority - High Impact

#### 1. Notifications/Alerts System
- [x] In-app toast notifications (already have toast system)
- [ ] System tray notifications (Tauri native) - future enhancement
- [x] Configurable alerts:
  - [x] Miner offline
  - [x] Temperature threshold exceeded
  - [x] Hashrate drop (percentage-based)
  - [x] Block found celebration
- [x] Sound alerts (optional)
- **Status**: Complete (v1.4.0)
- **Complexity**: Medium

#### 2. Historical Data Persistence
- [ ] SQLite database for storing mining history
- [ ] Configurable retention period (7 days, 30 days, etc.)
- [ ] Historical charts (24h, 7d, 30d views)
- [ ] Statistics: uptime %, average hashrate, etc.
- **Status**: Not started
- **Complexity**: High

#### 3. Power Consumption & Cost Tracking
- [x] Input electricity rate ($/kWh)
- [ ] Daily/weekly/monthly power usage stats - partial (daily done)
- [x] Cost estimation per miner and total
- [x] Efficiency metrics (J/TH)
- **Status**: Complete (v1.4.0)
- **Complexity**: Medium

#### 4. Profitability Calculator
- [ ] Fetch current BTC price (API integration)
- [ ] Fetch current network difficulty
- [ ] Calculate estimated daily/weekly/monthly earnings
- [ ] Show profitability after electricity costs
- **Status**: Not started
- **Complexity**: Medium

#### 5. Miner Auto-Discovery
- [ ] Scan local network for miners
- [ ] Detect common miner ports/endpoints
- [ ] One-click add discovered miners
- **Status**: Not started
- **Complexity**: Medium-High

---

### Medium Priority - Quality of Life

#### 6. Bulk Actions
- [ ] Select multiple miners
- [ ] Apply frequency/voltage to all selected
- [ ] Enable/disable auto-tuner on multiple
- [ ] Restart multiple miners
- **Status**: Not started
- **Complexity**: Medium

#### 7. Miner Groups/Tags
- [ ] Create custom groups (e.g., "Office", "Garage")
- [ ] Color-coded tags
- [ ] Filter dashboard by group
- [ ] Group-level stats aggregation
- **Status**: Not started
- **Complexity**: Medium

#### 8. Export Data
- [x] Export current stats to CSV
- [ ] Export historical data to CSV/JSON
- [x] Export miner configurations (via Backup)
- [ ] Scheduled auto-export
- **Status**: Partially complete (v1.3.0)
- **Complexity**: Low

#### 9. Backup/Restore Settings
- [x] Export all miner configs to JSON
- [x] Export tuner settings
- [x] Import/restore from backup file
- [ ] Cloud backup option (future)
- **Status**: Complete (v1.3.0)
- **Complexity**: Low

#### 10. Custom Dashboard Layouts
- [ ] Drag-and-drop card arrangement
- [ ] Configurable card size (compact/normal/expanded)
- [ ] Choose which stats to display
- [ ] Save layout preferences
- **Status**: Not started
- **Complexity**: High

---

### Lower Priority - Nice to Have

#### 11. Firmware Update Checker
- [x] Check AxeOS GitHub releases
- [x] Compare with miner's current version
- [x] Alert when updates available
- [x] Link to update instructions (GitHub release page)
- **Status**: Complete (v1.3.0)
- **Complexity**: Low

#### 12. Multi-language Support (i18n)
- [ ] Extract all strings to translation files
- [ ] English (default)
- [ ] Spanish
- [ ] German
- [ ] Chinese
- [ ] Community contributions
- **Status**: Not started
- **Complexity**: Medium

#### 13. WebSocket Support
- [ ] Real-time updates (if miners support it)
- [ ] Reduce polling overhead
- [ ] Instant status changes
- **Status**: Not started
- **Complexity**: High (depends on miner firmware)

#### 14. Dark/Light Theme Scheduling
- [ ] Auto-switch based on time
- [ ] Follow system preference
- [ ] Custom schedule
- **Status**: Not started
- **Complexity**: Low

---

## Implementation Progress

### Currently Working On
- Nothing in progress

### Next Up
- TBD (user to choose)

---

## Session Notes

### Session 1 (2025-11-26)
- Added dynamic hashrate scaling for high-power miners
- Created device-specs.ts for estimated efficiency
- Added BitDSK N5.Rex to device specs
- Released v1.2.0

### Session 2 (2025-11-26)
- Added Tools Menu with settings gear icon
- Implemented CSV export for miner stats
- Implemented Backup/Restore for miner configurations
- Added Firmware Update Checker (checks AxeOS GitHub releases)
- Ready for v1.3.0 release

### Session 3 (2025-11-26)
- **Notifications/Alerts System**
  - Created alert-settings.ts with configurable thresholds
  - Created use-app-settings.ts hook for persistent settings
  - Created use-alert-monitor.ts hook for monitoring miner states
  - Created settings-dialog.tsx with tabbed UI (Alerts / Power & Cost)
  - Implemented: offline/online alerts, temp warnings, hashrate drop, block found
  - Added optional sound alerts (Web Audio API beep)
- **Power/Cost Tracking**
  - Electricity rate input with currency selector
  - Daily cost calculation per miner
  - Total daily cost in global stats bar
  - J/TH efficiency display
- Ready for v1.4.0 release

---

## Device Specs Database
Located at: `src/lib/device-specs.ts`

### Currently Supported:
- Magic Miner BG01 (5.5 TH/s)
- Magic Miner BG02 (6.8 TH/s)
- NerdAxeQ++ (5 TH/s)
- NerdAxe (500 GH/s)
- Canaan Nano S (8 TH/s)
- BitDSK N5.Rex (300 GH/s)
- Piaxe (500 GH/s)
- Jade (500 GH/s)
- Lucky Miner (500 GH/s)

### To Add:
- (Add new devices here as they're identified)
