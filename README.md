☢️ VAULT-TEC INDUSTRIES PRESENTS ☢️
PIP-BOY MINING TERMINAL: AxeOS Live!
"Because civilization won't rebuild itself without hashrate, Vault Dweller!"

📟 WHAT IS THIS CONTRAPTION?
AxeOS Live! is a Pre-War desktop application recovered from Vault-Tec's cryptocurrency division. It runs natively on Windows, macOS, and Linux terminals, providing real-time monitoring, performance analytics, and intelligent auto-tuning for your AxeOS mining units scattered across the wasteland... er, your local network.
All configurations are stored locally on your Pip-Boy's holotape drive and will survive even the most aggressive radroach infestations!

🏠 WHY A DESKTOP APPLICATION?
To monitor mining units on your private vault network, the application must operate from a terminal within that same network. Our Vault-Tec engineers have provided:

Direct Network Access - No Brotherhood of Steel firewalls (CORS restrictions) to worry about
Superior Performance - Native system integration, just like the old world intended
Persistent Memory Banks - Your configurations survive system reboots and nuclear winters
Auto-Update Protocol - Seamless patches beamed directly to your terminal


🚀 DEPLOYMENT PROCEDURES
Download the Application (Recommended for Non-Technical Vault Dwellers)
For Windows Terminal Operators:
Acquire one of the following installation holotapes from the Releases terminal:

MSI Installer (Overseer Recommended): AxeOS Live!_1.0.0_x64_en-US.msi
EXE Installer: AxeOS Live!_1.0.0_x64-setup.exe

Double-click the installer and follow the friendly Vault-Boy prompts. Your terminal will be operational before you can say "War never changes!"

Operating Your New Terminal

Launch AxeOS Live! from your Start Menu or Desktop Shortcut
Register Your Mining Units:

Locate and press the [Add Miner] button
Input your unit's local network designation (e.g., 192.168.1.100)
Assign a custom callsign and accent color (for that personal touch!)
Confirm with [Add Miner]


Your fleet roster will be automatically preserved and restored upon each terminal activation!


Building from Source (For Vault-Tec Engineers Only)
Should you wish to construct the application yourself or contribute to the cause:
Prerequisites:

Node.js: Acquire from nodejs.org (Version 18+ required — older versions may contain synth code)
Rust: Essential for Tauri construction. Install from rustup.rs
npm: Bundled automatically with Node.js (how convenient!)

Assembly Protocol:
# Clone the Repository from the Archives
git clone https://github.com/yourusername/Axe-OS-Multitool.git
cd Axe-OS-Multitool

# Acquire Dependencies
npm install

# Initiate Development Mode
npm run tauri:dev
This launches the terminal with hot-reload enabled. Vault-Tec is not responsible for burns from hot reloads.
Constructing Distribution Holotapes:
npm run tauri:build
Output manifests in src-tauri/target/release/bundle/:

Windows: MSI and EXE installers
macOS: DMG disk image
Linux: AppImage and DEB packages

Pro-Tip: Build on the target platform for optimal results. Cross-compilation is about as reliable as a Mr. Handy with a loose motivator.

🔧 KEY FEATURES
Monitoring & Analytics Division
FeatureDescriptionReal-Time DashboardLive telemetry from all units: hashrate, temperature, frequency, voltage, power drawHistorical ChartsVisualize performance trends. Remember the good times!Performance StatisticsTrack shares accepted/rejected, pool difficulty, personal best, session dataDevice IntelligenceASIC model, AxeOS version, board revision, network configuration
Auto-Tuning Department
SystemFunctionIntelligent Auto-TunerAutomatically optimizes frequency and voltage to maintain target temperaturesAuto-Optimization EngineAnalyzes historical data to locate maximum efficiency settingsHashrate Verification ProtocolAutomatically reverts changes if performance degrades. No more crying over spilled settings!VRM Temperature SentinelDedicated voltage regulator monitoring. Those VRMs work hard!Low Voltage GuardianApplies safe settings when input voltage drops. Brownouts happen in the wasteland.Flatline Detection SystemDetects frozen hashrate and initiates automatic restart sequence
Data Preservation Vault

Local Holotape Storage - All configurations saved right on your terminal
Persistent Memory - Survives restarts, updates, and the occasional super mutant attack
Zero Cloud Dependency - Everything runs locally. The Enclave can't spy on your hashrate!


🎯 AUTO-TUNER OPERATOR'S MANUAL
Activation Sequence

Enable the Auto-Tuner: Toggle the switch on any miner card
Configure Parameters: Click the ⚙️ icon to access tuning controls
Monitor & Relax: The system handles adjustments automatically. Grab a Nuka-Cola!


Temperature-Based Optimization Protocol
The auto-tuner maintains core temperature around your Target Temp by dynamically adjusting frequency and voltage:
🔥 WHEN UNIT IS OVERHEATING:

Reduces frequency and voltage for thermal relief
VRM temperature monitored separately (double the protection!)

❄️ WHEN UNIT IS RUNNING COOL:

Increases frequency and voltage for performance boost
Smart voltage-stuck detection prevents inefficient tuning
Auto-pauses when ideal temperature achieved


Auto-Optimization Subroutine
The Auto-Optimizer is like having a tiny Vault-Tec scientist living in your terminal:

Data Collection - Continuously logs hashrate, temperature, frequency, voltage
Analysis Cycle - Every N cycles, examines all data within target temp range
Peak Detection - Identifies maximum hashrate achieved
Efficiency Selection - Finds settings with near-peak hashrate at lowest voltage
Auto-Application - Implements optimal configuration. Science!


Hashrate Verification System
"Trust, but verify!" — Vault-Tec Motto

Verification Delay: Configurable wait period (default 60 seconds) before assessment
Automatic Rollback: If hashrate drops >100 GH/s, previous settings restored immediately
Stability Analysis: Allows readings to normalize before judgment


Safety Protocols (S.P.E.C.I.A.L. Features)
ProtocolFunctionLow Voltage ShieldAuto-applies safe settings if input drops below 4.9VFlatline ResponseDetects stuck hashrate, initiates restartFrequency/Voltage BoundariesRespects configured min/max for safe operationAdjustment Cooldown60-second delay between changes prevents oscillation

Configurable Parameters
All tuner settings customizable per unit:

Target Temp / VR Target Temp - Desired operating temperatures
Min/Max Frequency - Safe frequency range (MHz)
Min/Max Voltage - Safe core voltage range (mV)
Step Sizes - Adjustment increment per change
Verification Wait Seconds - Delay before hashrate verification
Auto Optimize Trigger Cycles - Optimizer frequency
Efficiency Tolerance Percent - Acceptable hashrate variance
Flatline Detection - Enable/disable stuck detection

💡 VAULT-TEC TIP: Start with default settings and adjust gradually. Rome wasn't rebuilt in a day, and neither is the perfect overclock!

🔧 TROUBLESHOOTING TERMINAL
Application Won't Initialize
"Port Already in Use" Error:

Another instance may be active — terminate it first
Wait 30-60 seconds for port release (patience, Vault Dweller)
Alternative: Use Tauri mode with npm run tauri:dev

Build Failures:

Execute npm run typecheck for TypeScript diagnostics
Verify Rust installation: rustc --version
Purge build cache: rm -rf src-tauri/target


Cannot Establish Connection to Mining Units

Confirm units are on the same network as your terminal
Verify IP addresses via router admin panel
Test connectivity: visit http://MINER_IP in your browser
Check firewall isn't blocking local network traffic (damn raiders)


Data Not Persisting

Desktop installation uses Tauri's store plugin for local persistence
Data survives updates and restarts
Development mode uses browser localStorage (less reliable than a Vault-Tec shelter)


Auto-Tuner Misbehavior
Tuner Making Excessive Adjustments:

Increase "Verification Wait Seconds" for longer stabilization
Reduce step sizes for gentler modifications
Adjust temperature tolerance range

Hashrate Continuously Declining:

Lower max frequency/voltage limits
Increase "Efficiency Tolerance Percent" for conservative operation
Disable "Auto Optimize" — use manual temperature tuning only


⚙️ ADVANCED CONFIGURATION
Custom Terminal Icon
To personalize your installation:

Create a square PNG image (512x512 or 1024x1024 recommended)
Save to project root directory
Execute: npm run tauri icon your-icon.png
Rebuild: npm run tauri:build

Express your individuality! Within Vault-Tec approved parameters, of course.

Network Configuration (Development Mode)
Default port: 9002
To modify, edit package.json:
"dev": "next dev -p YOUR_PORT -H 0.0.0.0"

📚 SUPPLEMENTARY DOCUMENTATION
For the technically curious Vault Dweller:

TAURI_SETUP.md - Desktop application architecture
AUTO_TUNE_FIXES.md - Auto-tuner implementation specifics
HASHRATE_VERIFICATION.md - Verification system details
NATIVE_CONVERSION.md - Conversion technical notes


🤝 CONTRIBUTE TO THE CAUSE
Contributions welcome! Submit issues or pull requests to help rebuild civilization, one commit at a time.

⚖️ LEGAL DISCLAIMER
This project is provided as-is for monitoring and managing your AxeOS miners. Vault-Tec Industries assumes no liability for mining addiction, excessive hashrate obsession, or arguments with family members about electricity bills.

☢️ VAULT-TEC MINING DIVISION ☢️
"Preparing for the future... one block at a time!"
Remember: Stay S.P.E.C.I.A.L., Stay Profitable!
— Your Friends at Vault-Tec
