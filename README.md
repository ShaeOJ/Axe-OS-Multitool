# AxeOS Live!

A native desktop application for monitoring and auto-tuning Bitaxe and other AxeOS-based miners on your local network.

## What is AxeOS Live?

AxeOS Live is a **desktop application** that runs natively on Windows, macOS, and Linux. It provides real-time monitoring, performance analytics, and intelligent auto-tuning for your AxeOS miners. All your miner configurations are saved locally and persist between app restarts.

### Why a Desktop App?

To monitor miners on your private home network, the application must run on a computer within that same network. The desktop app provides:
- **Direct network access** to your miners without CORS restrictions
- **Better performance** with native system integration
- **Persistent storage** of your miner configurations
- **Auto-update capabilities** for seamless updates

## Getting Started

### Download the App (Easiest)

**For Windows Users:**

Download and run one of the installers from the [Releases](../../releases) page:
- **MSI Installer** (Recommended): `AxeOS Live!_1.0.0_x64_en-US.msi`
- **EXE Installer**: `AxeOS Live!_1.0.0_x64-setup.exe`

Double-click the installer and follow the prompts. The app will be installed and ready to use!

### Using the App

1.  **Launch AxeOS Live!** from your Start Menu or Desktop
2.  **Add Your Miners**:
    - Click the "Add Miner" button
    - Enter your miner's local IP address (e.g., `192.168.1.100`)
    - Give it a custom name and choose an accent color
    - Click "Add Miner"

    Your miners will be automatically saved and loaded on next startup!

### Building from Source (Developers)

If you want to build the app yourself or contribute to development:

#### Prerequisites

- **Node.js**: Download from [nodejs.org](https://nodejs.org/). Version 18 or higher is required.
- **Rust**: Required for building the Tauri app. Install from [rustup.rs](https://rustup.rs/)
- **npm**: Comes automatically with Node.js

#### Setup

1.  **Clone the Repository**:
    ```bash
    git clone https://github.com/yourusername/Axe-OS-Multitool.git
    cd Axe-OS-Multitool
    ```

2.  **Install Dependencies**:
    ```bash
    npm install
    ```

3.  **Run in Development Mode**:
    ```bash
    npm run tauri:dev
    ```
    This will launch the desktop app with hot-reload enabled.

#### Building Installers

To create your own installers:

```bash
npm run tauri:build
```

This creates installers in `src-tauri/target/release/bundle/`:
- **Windows**:
  - `msi/AxeOS Live!_1.0.0_x64_en-US.msi` (MSI Installer)
  - `nsis/AxeOS Live!_1.0.0_x64-setup.exe` (EXE Installer)
- **macOS**: `.dmg` file in `dmg/` folder
- **Linux**: `.AppImage` or `.deb` in respective folders

**Note**: For best results, build on the target platform (build Windows apps on Windows, etc.)

## Key Features

### Monitoring & Analytics
- **Real-time Dashboard**: View live data from all your miners including hashrate, temperature, frequency, voltage, and power consumption
- **Historical Charts**: Visualize your miner's performance over time with hashrate and temperature graphs
- **Performance Statistics**: Track shares accepted/rejected, pool difficulty, best share, and session stats
- **Device Information**: View ASIC model, AxeOS version, board version, and network details

### Auto-Tuning System
- **Intelligent Auto-Tuner**: Automatically optimizes frequency and voltage to maintain target temperatures
- **Auto-Optimization**: Analyzes historical data to find the most power-efficient settings
- **Hashrate Verification**: Automatically reverts changes if hashrate drops significantly
- **VRM Temperature Protection**: Dedicated monitoring and cooling for voltage regulator temperatures
- **Low Voltage Protection**: Automatically applies safe settings when input voltage drops
- **Flatline Detection**: Detects stuck hashrate and restarts miner if needed

### Data Persistence
- **Local Storage**: All miner configurations saved locally in the app
- **Persistent Settings**: Your miners and their custom tuner settings survive app restarts
- **No Cloud Dependency**: Everything runs locally on your network

## Auto-Tuner Guide

### How to Enable Auto-Tuning

1. **Enable the Auto-Tuner**: Toggle the "Auto-Tuner" switch on any miner card
2. **Configure Settings**: Click the ⚙️ settings icon next to the toggle to customize tuning parameters
3. **Monitor Performance**: The tuner will automatically adjust settings and notify you of changes

### Temperature-Based Tuning

The auto-tuner maintains your miner's core temperature around the configured `Target Temp` by dynamically adjusting frequency and voltage:

**When the miner is too hot:**
- Reduces frequency and voltage to cool down
- VRM temperature is also monitored separately for additional protection

**When the miner is cool (below target):**
- Increases frequency and voltage to boost performance
- Implements smart voltage-stuck detection to prevent inefficient tuning
- Automatically pauses when temperature reaches the ideal range

### Auto-Optimization Feature

The Auto-Optimizer analyzes historical performance data to find the most power-efficient settings:

1.  **Data Collection**: Continuously records hashrate, temperature, frequency, and voltage data
2.  **Analysis**: Every N cycles (configurable via `Auto Optimize Trigger Cycles`), analyzes all data within your target temperature range
3.  **Peak Detection**: Identifies the maximum hashrate achieved in the target temp range
4.  **Efficiency Selection**: Finds settings that achieve near-peak hashrate (within `Efficiency Tolerance Percent`) with the **lowest voltage**
5.  **Application**: Automatically applies the most efficient settings

### Hashrate Verification

The tuner includes intelligent verification to ensure changes actually improve performance:

- **Verification Wait Time**: Configurable delay (default 60 seconds) before checking if hashrate improved
- **Automatic Revert**: If hashrate drops significantly (>100 GH/s), automatically reverts to previous settings
- **Stability Check**: Allows hashrate to stabilize before making judgments

### Safety Features

- **Low Voltage Protection**: Automatically applies safe settings if input voltage drops below 4.9V
- **Flatline Detection**: Detects stuck hashrate and restarts miner automatically
- **Frequency & Voltage Limits**: Respects configured min/max values for safe operation
- **Adjustment Cooldown**: Waits 60 seconds between adjustments to prevent oscillation

### Configurable Settings

All tuner parameters can be customized per miner:

- **Target Temp / VR Target Temp**: Desired operating temperatures
- **Min/Max Frequency**: Safe frequency range (MHz)
- **Min/Max Voltage**: Safe core voltage range (mV)
- **Step Sizes**: How much to adjust frequency/voltage per change
- **Verification Wait Seconds**: How long to wait before verifying hashrate changes
- **Auto Optimize Trigger Cycles**: How often to run the optimizer
- **Efficiency Tolerance Percent**: Acceptable hashrate variance for efficiency optimization
- **Flatline Detection**: Enable/disable stuck hashrate detection

**Tip**: Start with default settings and adjust gradually based on your miner's behavior and your power/performance goals.

## Troubleshooting

### App Won't Start

**Port Already in Use Error:**
- Another instance may be running - close it first
- Wait 30-60 seconds for the port to be released
- Or use the Tauri version: `npm run tauri:dev` instead

**Build Errors:**
- Run `npm run typecheck` to check for TypeScript errors
- Ensure Rust is installed: `rustc --version`
- Clear build cache: `rm -rf src-tauri/target` (or delete the folder manually)

### Can't Connect to Miners

- Ensure your miners are on the same network as the computer running the app
- Verify miner IP addresses are correct (check your router)
- Test miner access by visiting `http://MINER_IP` in your browser
- Check firewall settings aren't blocking local network connections

### Data Not Persisting

- In the installed desktop app, miner configurations are stored locally using Tauri's store plugin
- Data persists between app updates and restarts
- In dev mode, data is stored in browser localStorage

### Auto-Tuner Issues

**Tuner making too many changes:**
- Increase "Verification Wait Seconds" to give more time between adjustments
- Reduce step sizes for gentler adjustments
- Adjust target temperature tolerance

**Hashrate keeps dropping:**
- Lower max frequency/voltage limits
- Increase "Efficiency Tolerance Percent" for more conservative optimization
- Disable "Auto Optimize" and use manual temperature-based tuning only

## Advanced Configuration

### Customizing the App Icon

To use your own icon:

1. Create a square PNG image (512x512 or 1024x1024 recommended)
2. Save it in the project root
3. Run: `npm run tauri icon your-icon.png`
4. Rebuild: `npm run tauri:build`

This will generate all required icon sizes for Windows, macOS, and Linux.

### Custom Network Settings (Development)

The app runs on port 9002 by default during development. To change this, edit `package.json`:

```json
"dev": "next dev -p YOUR_PORT -H 0.0.0.0"
```

## Contributing

Contributions are welcome! Please feel free to submit issues or pull requests.

## Support

For detailed technical documentation about the Tauri conversion and architecture, see:
- `TAURI_SETUP.md` - Tauri desktop app setup
- `AUTO_TUNE_FIXES.md` - Auto-tuner implementation details
- `HASHRATE_VERIFICATION.md` - Hashrate verification system
- `NATIVE_CONVERSION.md` - Native conversion notes

## License

This project is provided as-is for monitoring and managing your AxeOS miners.