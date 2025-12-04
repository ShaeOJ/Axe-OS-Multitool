# AxeOS Live! Feature Roadmap

## Current Version: 1.7.0

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
- [x] **Update Notifications**
  - [x] Automatic GitHub release checking
  - [x] Update banner with release notes preview
  - [x] Settings > About tab with version info
  - [x] Manual "Check for Updates" button
- [x] **Auto-Tuner Reliability Improvements**
  - [x] Hybrid pause mode - safety checks continue while paused
  - [x] Ambient temperature spike detection
  - [x] Fixed idle tuner bug after ~1 hour

### Completed Features (v1.5.0)
- [x] **Hashrate Benchmark Tool**
  - [x] Quick benchmark - Test current settings stability
  - [x] Full optimization - Automated search for best voltage/frequency
  - [x] Efficiency finder - Find the most efficient (J/TH) settings
  - [x] Visual progress - Real-time display during benchmarking
  - [x] Safety cutoffs - Temperature, power, voltage limits
  - [x] Results table - Top 5 by hashrate and efficiency
  - [x] Auto-apply best settings found

### Completed Features (v1.6.0 - v1.6.4)
- [x] **Bulk Actions**
  - [x] Select multiple miners with selection mode toggle
  - [x] Apply frequency/voltage to all selected
  - [x] Enable/disable auto-tuner on multiple miners
  - [x] Restart multiple miners with confirmation
  - [x] Floating action bar with quick actions
- [x] **Miner Groups/Tags**
  - [x] Create custom groups with names
  - [x] 14 preset color options for group identification
  - [x] Assign/remove miners to groups (single or bulk)
  - [x] Filter/group dashboard by group or status
  - [x] Collapsible group sections
  - [x] Group badge display on miner cards
- [x] **Benchmark Improvements**
  - [x] Device-specific benchmark profiles with auto-tuner integration
  - [x] Benchmark profile persistence (save/load best settings per miner)
  - [x] Fixed benchmark profile mode dropdown and saving
  - [x] Improved hashrate drop detection for high-hashrate devices
  - [x] Performance improvements with throttled updates
  - [x] Miner card integration - open benchmark from card

### Completed Features (Previously Implemented)
- [x] **Historical Data Persistence**
  - [x] SQLite database for storing mining history
  - [x] Configurable retention period (7 days default)
  - [x] Historical charts (24h, 7d, 30d views)
  - [x] Analytics page with statistics
- [x] **Profitability Calculator**
  - [x] Fetch current BTC price (CoinGecko API)
  - [x] Fetch current network difficulty
  - [x] Calculate estimated daily/weekly/monthly earnings
  - [x] Show profitability after electricity costs
- [x] **Miner Auto-Discovery**
  - [x] Scan local network for miners
  - [x] Detect common miner ports/endpoints
  - [x] One-click add discovered miners

---

## Planned Features

### High Priority - High Impact

#### 1. Benchmark History UI - COMPLETED (v1.7.0)
- [x] Dedicated dialog to view past benchmark runs
- [x] List all benchmarks with timestamps per miner
- [x] Compare multiple benchmark results side-by-side
- [x] View detailed results from historical benchmarks
- [x] Delete individual or all benchmark history
- [x] Stores up to 10 benchmarks per miner
- **Status**: Complete
- **Complexity**: Medium

---

### Medium Priority - Quality of Life

#### 2. Export Data (Enhanced)
- [x] Export current stats to CSV
- [ ] Export historical data to CSV/JSON
- [x] Export miner configurations (via Backup)
- [ ] Scheduled auto-export
- **Status**: Partially complete (v1.3.0)
- **Complexity**: Low

#### 3. Custom Dashboard Layouts
- [ ] Drag-and-drop card arrangement
- [ ] Configurable card size (compact/normal/expanded)
- [ ] Choose which stats to display
- [ ] Save layout preferences
- **Status**: Not started
- **Complexity**: High

#### 4. System Tray Notifications
- [ ] Native system tray notifications (Tauri)
- [ ] Background monitoring when minimized
- [ ] Tray icon with quick status
- **Status**: Not started
- **Complexity**: Medium

---

### Lower Priority - Nice to Have

#### 5. Multi-language Support (i18n)
- [ ] Extract all strings to translation files
- [ ] English (default)
- [ ] Spanish
- [ ] German
- [ ] Chinese
- [ ] Community contributions
- **Status**: Not started
- **Complexity**: Medium

#### 6. WebSocket Support
- [ ] Real-time updates (if miners support it)
- [ ] Reduce polling overhead
- [ ] Instant status changes
- **Status**: Not started
- **Complexity**: High (depends on miner firmware)

#### 7. Dark/Light Theme Scheduling
- [ ] Auto-switch based on time
- [ ] Follow system preference
- [ ] Custom schedule
- **Status**: Not started
- **Complexity**: Low

#### 8. Cloud Backup
- [ ] Optional cloud sync for settings
- [ ] Cross-device configuration sharing
- **Status**: Not started
- **Complexity**: High

---

## Implementation Progress

### Currently Working On
- Nothing in progress

### Next Up
- Export historical data to CSV/JSON
- System Tray Notifications
- Custom Dashboard Layouts

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

### Session 4 (2025-12-02)
- **Auto-Tuner Reliability Fixes**
  - Fixed tuner going idle after ~1 hour when temp stabilized
  - Implemented hybrid pause mode - safety checks continue while paused
  - Added ambient temperature spike detection while paused
  - Flatline detection and auto-optimization now run regardless of pause state
- **Update Notifications**
  - Created update-checker.ts for GitHub releases integration
  - Created update-banner.tsx with dismissable notification
  - Added Settings > About tab with version info and manual check
  - Automatic checks on startup and every 6 hours
- Released v1.4.0

### Session 5 (2025-12-02)
- **Hashrate Benchmark Tool**
  - Created benchmark.ts with full TypeScript port of Python benchmark logic
  - Created benchmark page with configuration, live progress, and results display
  - Three benchmark modes: Quick (test current), Optimize (max hashrate), Efficiency (best J/TH)
  - Real-time progress display with hashrate, temperature, power stats
  - Safety features: temp limits, power limits, voltage monitoring
  - Results table showing top 5 by hashrate and efficiency
  - Auto-applies best settings found after benchmark completes
  - Added to Tools menu for easy access
- Released v1.5.0

### Session 6 (2025-12-02 - 2025-12-03)
- **Benchmark Fixes (v1.6.0 - v1.6.4)**
  - Fixed benchmark window not connecting when opened from miner card
  - Improved benchmark error handling
  - Simplified miner card benchmark button to open Tools window
  - Fixed APP_VERSION not updated in update-checker
  - Improved benchmark performance with throttled updates
  - Improved hashrate drop detection for benchmark and high-hashrate devices
  - Fixed benchmark profile mode dropdown and increase voltage limits
  - Fixed benchmarkProfileMode not saving (was being converted to NaN)
- **Bulk Actions & Groups** (completed but not documented)
  - Full bulk actions implementation with floating action bar
  - Complete miner groups/tags with color coding and filtering
- Updated roadmap to reflect v1.6.4 status

### Session 7 (2025-12-03)
- Updated ROADMAP.md to reflect completed features (Bulk Actions, Miner Groups)
- **Benchmark History UI**
  - Created `benchmark-history.ts` for history storage (up to 10 entries per miner)
  - Created `BenchmarkHistoryDialog` component with full history viewing
  - List view showing all past benchmarks with date/time/mode/results
  - Detailed view with summary stats, best hashrate, best efficiency, safe limits
  - All Results tab showing every tested frequency/voltage combination
  - Compare mode to compare two benchmark runs side-by-side
  - Delete individual entries or clear all history
  - Integrated into benchmark page with "View History" button
  - Auto-saves to history when saving benchmark profile

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
