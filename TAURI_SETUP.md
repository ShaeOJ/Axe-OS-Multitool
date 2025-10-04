# AxeOS Live! - Tauri Desktop App Setup

Your AxeOS Live! app has been successfully converted to a Tauri desktop application with auto-update capabilities!

## What Changed

### 1. **Local Storage for Miner Configuration**
- Miner configurations are now stored in browser localStorage
- Removed WebSocket server for state sync
- Removed `/api/state` and `/api/miners/[ip]` CRUD endpoints

### 2. **Desktop Application**
- Runs as a native Windows, macOS, and Linux application
- Better performance and system integration
- Runs Next.js server internally

### 3. **Kept Network Proxy Routes**
- `/api/miner/[ip]` routes still work to proxy requests to your miners
- This avoids CORS issues when fetching from miner devices
- Allows the app to connect to miners on your local network

### 4. **Auto-Update System**
- Automatic update checking on app launch
- One-click download and install updates
- Update UI integrated into the app

## Development

### Run in Development Mode
```bash
npm run tauri:dev
```

This will:
1. Start the Next.js dev server on port 9002
2. Launch the Tauri desktop window
3. Enable hot-reload for rapid development

## Building for Production

### Build for Current Platform
```bash
npm run tauri:build
```

This creates an installer for your current platform in `src-tauri/target/release/bundle/`.

**⚠️ Important Note:** Production builds currently require the Next.js server to be running. For a fully standalone app, you'll need to either:
1. Use Next.js standalone mode with a custom server
2. Convert remaining API routes to Tauri commands in Rust
3. Bundle Next.js server with the application

For now, the app works perfectly in development mode with `npm run tauri:dev`.

### Build for All Platforms
```bash
npm run tauri:build:all
```

**Note:** Cross-compilation has limitations:
- **Windows:** Build on Windows for best results
- **macOS:** Build on macOS (requires Xcode)
- **Linux:** Build on Linux

## Setting Up Auto-Updates

The auto-updater is configured but requires additional setup for production use:

### 1. Generate Signing Keys

Run this command to generate update signing keys:
```bash
npm run tauri signer generate -- -w ~/.tauri/myapp.key
```

This creates a public/private key pair for signing updates.

### 2. Update Configuration

Edit `src-tauri/tauri.conf.json`:

```json
{
  "plugins": {
    "updater": {
      "active": true,
      "endpoints": [
        "https://github.com/YOUR_USERNAME/YOUR_REPO/releases/latest/download/latest.json"
      ],
      "dialog": true,
      "pubkey": "YOUR_PUBLIC_KEY_HERE"
    }
  }
}
```

Replace:
- `YOUR_USERNAME/YOUR_REPO` with your GitHub repository
- `YOUR_PUBLIC_KEY_HERE` with the public key from step 1

### 3. Set Up GitHub Releases

1. Create a new release on GitHub
2. Upload your built application files
3. Run this command to sign and create the update manifest:

```bash
npm run tauri signer sign path/to/your/app.exe -k ~/.tauri/myapp.key
```

4. Upload the generated `.sig` files and `latest.json` to your GitHub release

### 4. Environment Variable

Set the private key as an environment variable for CI/CD:
```bash
export TAURI_SIGNING_PRIVATE_KEY=$(cat ~/.tauri/myapp.key)
```

## File Locations

### App Configuration
- `src-tauri/tauri.conf.json` - Main Tauri configuration
- `src-tauri/Cargo.toml` - Rust dependencies
- `src-tauri/capabilities/default.json` - App permissions

### Build Output
- Windows: `src-tauri/target/release/bundle/nsis/`
- macOS: `src-tauri/target/release/bundle/dmg/`
- Linux: `src-tauri/target/release/bundle/appimage/` or `/deb/`

## Removed Files/Features

The following server-side features were removed:
- `/src/server/` - WebSocket server and state management
- `/src/app/api/state/` - State API route (replaced with localStorage)
- `/src/app/api/miners/[ip]` - Miners CRUD API (replaced with localStorage)
- `miners.json` - Server-side storage file (data now in localStorage)

## Kept Files/Features

The following are still used:
- `/src/app/api/miner/[ip]/route.ts` - Proxy to fetch miner data
- `/src/app/api/miner/[ip]/restart/route.ts` - Proxy to restart miners
- `/src/app/api/miner/[ip]/settings/route.ts` - Proxy to update miner settings

## Important Notes

### For Development
- The app checks for updates on launch (only in production builds)
- In development mode, updates are disabled
- All miner data is stored in browser localStorage

### For Production
- Code signing is **required** for:
  - macOS (requires Apple Developer certificate)
  - Windows (optional but recommended for SmartScreen)
- Auto-updates require HTTPS endpoints
- The updater uses the public key to verify update authenticity

### Data Migration
If you had miners configured in the old version:
1. Export your `miners.json` file
2. In the new app, manually add each miner using the UI
3. The app will automatically save to localStorage

## Platform-Specific Requirements

### Windows
- No additional requirements for building
- Code signing certificate recommended for distribution

### macOS
- Xcode Command Line Tools required
- Apple Developer certificate required for distribution
- Notarization required for Gatekeeper

### Linux
- Build dependencies:
  ```bash
  sudo apt update
  sudo apt install libwebkit2gtk-4.0-dev \
    build-essential \
    curl \
    wget \
    file \
    libssl-dev \
    libgtk-3-dev \
    libayatana-appindicator3-dev \
    librsvg2-dev
  ```

## Troubleshooting

### Update Check Fails
- Verify your GitHub repository is public or update endpoint is accessible
- Check that `pubkey` matches your signing key
- Ensure `latest.json` is properly formatted

### Build Fails
- Run `npm run typecheck` to check for TypeScript errors
- Ensure Rust is installed: `rustc --version`
- Clear build cache: `rm -rf src-tauri/target`

### App Won't Start
- Check console for errors
- Verify Next.js build succeeded: `npm run build`
- Ensure `out` directory exists

## Resources

- [Tauri Documentation](https://tauri.app/v1/guides/)
- [Tauri Updater Guide](https://tauri.app/v1/guides/distribution/updater)
- [Code Signing Guide](https://tauri.app/v1/guides/distribution/sign-windows)

## Support

For issues specific to the Tauri conversion, check:
1. Browser console (F12) for frontend errors
2. Terminal output for Rust/Tauri errors
3. `src-tauri/target/release/` for build logs
