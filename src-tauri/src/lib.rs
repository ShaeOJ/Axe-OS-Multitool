use serde::{Deserialize, Serialize};
use std::net::IpAddr;
use std::time::Duration;
use tauri::{
    AppHandle, Emitter, Manager, WebviewUrl, WebviewWindowBuilder,
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    image::Image,
};
use futures::future::join_all;

#[derive(Debug, Serialize, Deserialize)]
struct MinerSettingsUpdate {
    frequency: u32,
    #[serde(rename = "coreVoltage")]
    core_voltage: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct DiscoveredMiner {
    ip: String,
    hostname: Option<String>,
    version: Option<String>,
    model: Option<String>,
}

// Command to fetch miner data
#[tauri::command]
async fn get_miner_data(ip: String) -> Result<serde_json::Value, String> {
    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(10))
        .build()
        .map_err(|e| e.to_string())?;

    let api_paths = vec![
        "/api/system/info",
        "/api/system",
        "/api/swarm/info",
    ];

    for path in api_paths {
        let url = format!("http://{}{}", ip, path);
        match client.get(&url).send().await {
            Ok(response) => {
                if response.status().is_success() {
                    match response.json::<serde_json::Value>().await {
                        Ok(json) => return Ok(json),
                        Err(_) => continue,
                    }
                }
            }
            Err(_) => continue,
        }
    }

    Err(format!("Failed to connect to miner at {}", ip))
}

// Command to restart miner
#[tauri::command]
async fn restart_miner(ip: String) -> Result<serde_json::Value, String> {
    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(10))
        .build()
        .map_err(|e| e.to_string())?;

    let url = format!("http://{}/api/system/restart", ip);

    let response = client
        .post(&url)
        .send()
        .await
        .map_err(|e| e.to_string())?;

    if response.status().is_success() {
        match response.json::<serde_json::Value>().await {
            Ok(json) => Ok(json),
            Err(_) => Ok(serde_json::json!({"success": true})),
        }
    } else {
        Err(format!("Miner restart failed with status: {}", response.status()))
    }
}

// Command to open analytics window
#[tauri::command]
async fn open_analytics_window(app: AppHandle) -> Result<(), String> {
    // Check if window already exists
    if let Some(window) = app.get_webview_window("analytics") {
        // Window exists, focus it
        window.set_focus().map_err(|e| e.to_string())?;
        return Ok(());
    }

    // Create new analytics window
    let url = WebviewUrl::App("analytics".into());

    WebviewWindowBuilder::new(&app, "analytics", url)
        .title("Mining Analytics - AxeOS Live!")
        .inner_size(1200.0, 800.0)
        .min_inner_size(800.0, 600.0)
        .resizable(true)
        .center()
        .build()
        .map_err(|e| e.to_string())?;

    Ok(())
}

// Command to close analytics window
#[tauri::command]
async fn close_analytics_window(app: AppHandle) -> Result<(), String> {
    if let Some(window) = app.get_webview_window("analytics") {
        window.close().map_err(|e| e.to_string())?;
    }
    Ok(())
}

// Command to open settings window
#[tauri::command]
async fn open_settings_window(app: AppHandle) -> Result<(), String> {
    // Check if window already exists
    if let Some(window) = app.get_webview_window("settings") {
        // Window exists, focus it
        window.set_focus().map_err(|e| e.to_string())?;
        return Ok(());
    }

    // Create new settings window
    let url = WebviewUrl::App("settings".into());

    WebviewWindowBuilder::new(&app, "settings", url)
        .title("Settings - AxeOS Live!")
        .inner_size(500.0, 700.0)
        .min_inner_size(400.0, 500.0)
        .resizable(true)
        .center()
        .build()
        .map_err(|e| e.to_string())?;

    Ok(())
}

// Command to close settings window
#[tauri::command]
async fn close_settings_window(app: AppHandle) -> Result<(), String> {
    if let Some(window) = app.get_webview_window("settings") {
        window.close().map_err(|e| e.to_string())?;
    }
    Ok(())
}

// Command to open tools window
#[tauri::command]
async fn open_tools_window(app: AppHandle) -> Result<(), String> {
    // Check if window already exists
    if let Some(window) = app.get_webview_window("tools") {
        // Window exists, focus it
        window.set_focus().map_err(|e| e.to_string())?;
        return Ok(());
    }

    // Create new tools window
    let url = WebviewUrl::App("tools".into());

    WebviewWindowBuilder::new(&app, "tools", url)
        .title("Tools & Settings - AxeOS Live!")
        .inner_size(500.0, 750.0)
        .min_inner_size(450.0, 600.0)
        .resizable(true)
        .center()
        .build()
        .map_err(|e| e.to_string())?;

    Ok(())
}

// Command to open benchmark window with larger size
// Optional miner_ip parameter to pre-select a miner
#[tauri::command]
async fn open_benchmark_window(app: AppHandle, miner_ip: Option<String>) -> Result<(), String> {
    // Check if window already exists
    if let Some(window) = app.get_webview_window("benchmark") {
        // Window exists, focus it and emit event to select miner
        window.set_focus().map_err(|e| e.to_string())?;
        if let Some(ip) = miner_ip {
            window.emit("select-miner", ip).map_err(|e| e.to_string())?;
        }
        return Ok(());
    }

    // Create new benchmark window with larger dimensions
    // Append miner_ip as query parameter if provided
    let url = match &miner_ip {
        Some(ip) => WebviewUrl::App(format!("benchmark?miner={}", ip).into()),
        None => WebviewUrl::App("benchmark".into()),
    };

    WebviewWindowBuilder::new(&app, "benchmark", url)
        .title("Hashrate Benchmark - AxeOS Live!")
        .inner_size(900.0, 800.0)
        .min_inner_size(700.0, 600.0)
        .resizable(true)
        .center()
        .build()
        .map_err(|e| e.to_string())?;

    Ok(())
}

// Command to update miner settings
#[tauri::command]
async fn update_miner_settings(ip: String, frequency: u32, core_voltage: u32) -> Result<serde_json::Value, String> {
    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(10))
        .build()
        .map_err(|e| e.to_string())?;

    let url = format!("http://{}/api/system", ip);

    let settings = MinerSettingsUpdate {
        frequency,
        core_voltage,
    };

    let response = client
        .patch(&url)
        .json(&settings)
        .send()
        .await
        .map_err(|e| e.to_string())?;

    if response.status().is_success() {
        match response.json::<serde_json::Value>().await {
            Ok(json) => Ok(json),
            Err(_) => Ok(serde_json::json!({"success": true})),
        }
    } else {
        let status = response.status();
        let error_text = response.text().await.unwrap_or_default();
        Err(format!("Failed to update settings ({}): {}", status, error_text))
    }
}

// Check if a single IP has a miner
async fn check_miner_at_ip(client: &reqwest::Client, ip: String) -> Option<DiscoveredMiner> {
    let api_paths = vec![
        "/api/system/info",
        "/api/system",
    ];

    for path in &api_paths {
        let url = format!("http://{}{}", ip, path);
        match client.get(&url).send().await {
            Ok(response) => {
                if response.status().is_success() {
                    if let Ok(json) = response.json::<serde_json::Value>().await {
                        // Extract miner info from response
                        let hostname = json.get("hostname")
                            .and_then(|v| v.as_str())
                            .map(|s| s.to_string());
                        let version = json.get("version")
                            .or_else(|| json.get("axeOSVersion"))
                            .and_then(|v| v.as_str())
                            .map(|s| s.to_string());
                        let model = json.get("ASICModel")
                            .and_then(|v| v.as_str())
                            .map(|s| s.to_string());

                        return Some(DiscoveredMiner {
                            ip,
                            hostname,
                            version,
                            model,
                        });
                    }
                }
            }
            Err(_) => continue,
        }
    }
    None
}

// Command to scan network for miners
#[tauri::command]
async fn scan_network(subnet: String, start: u8, end: u8) -> Result<Vec<DiscoveredMiner>, String> {
    // Parse the subnet (e.g., "192.168.1")
    let parts: Vec<&str> = subnet.split('.').collect();
    if parts.len() != 3 {
        return Err("Invalid subnet format. Expected format: 192.168.1".to_string());
    }

    // Validate subnet parts
    for part in &parts {
        if part.parse::<u8>().is_err() {
            return Err(format!("Invalid subnet octet: {}", part));
        }
    }

    // Create a client with short timeout for scanning
    let client = reqwest::Client::builder()
        .timeout(Duration::from_millis(1500)) // Short timeout for scanning
        .build()
        .map_err(|e| e.to_string())?;

    // Create tasks for all IPs in range
    let mut tasks = Vec::new();

    for i in start..=end {
        let ip = format!("{}.{}", subnet, i);
        let client_clone = client.clone();

        tasks.push(async move {
            check_miner_at_ip(&client_clone, ip).await
        });
    }

    // Run all scans concurrently
    let results = join_all(tasks).await;

    // Collect found miners
    let miners: Vec<DiscoveredMiner> = results.into_iter().flatten().collect();

    Ok(miners)
}

// Command to get local network info (for auto-detecting subnet)
#[tauri::command]
async fn get_local_subnet() -> Result<String, String> {
    // Try to get local IP addresses
    let interfaces = local_ip_address::list_afinet_netifas();

    match interfaces {
        Ok(addrs) => {
            for (_, ip) in addrs {
                if let IpAddr::V4(ipv4) = ip {
                    let octets = ipv4.octets();
                    // Skip loopback and link-local addresses
                    if octets[0] == 127 || (octets[0] == 169 && octets[1] == 254) {
                        continue;
                    }
                    // Return the first three octets as subnet
                    return Ok(format!("{}.{}.{}", octets[0], octets[1], octets[2]));
                }
            }
            Err("No suitable network interface found".to_string())
        }
        Err(e) => Err(format!("Failed to get network interfaces: {}", e)),
    }
}

// Command to show main window (called from tray)
#[tauri::command]
async fn show_main_window(app: AppHandle) -> Result<(), String> {
    if let Some(window) = app.get_webview_window("main") {
        window.show().map_err(|e| e.to_string())?;
        window.set_focus().map_err(|e| e.to_string())?;
    }
    Ok(())
}

// Command to hide main window to tray
#[tauri::command]
async fn hide_to_tray(app: AppHandle) -> Result<(), String> {
    if let Some(window) = app.get_webview_window("main") {
        window.hide().map_err(|e| e.to_string())?;
    }
    Ok(())
}

// Command to quit the application
#[tauri::command]
async fn quit_app(app: AppHandle) -> Result<(), String> {
    app.exit(0);
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_notification::init())
    .plugin(tauri_plugin_store::Builder::new().build())
    .plugin(tauri_plugin_shell::init())
    .plugin(tauri_plugin_sql::Builder::default().build())
    .invoke_handler(tauri::generate_handler![
      get_miner_data,
      restart_miner,
      update_miner_settings,
      open_analytics_window,
      close_analytics_window,
      open_settings_window,
      close_settings_window,
      open_tools_window,
      open_benchmark_window,
      scan_network,
      get_local_subnet,
      show_main_window,
      hide_to_tray,
      quit_app
    ])
    .setup(|app| {
      // Setup logging in debug mode
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }

      // Create system tray
      let show_item = MenuItem::with_id(app, "show", "Show AxeOS Live!", true, None::<&str>)?;
      let analytics_item = MenuItem::with_id(app, "analytics", "Open Analytics", true, None::<&str>)?;
      let quit_item = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;

      let menu = Menu::with_items(app, &[&show_item, &analytics_item, &quit_item])?;

      let tray_icon = TrayIconBuilder::new()
        .icon(Image::from_path("icons/icon.png").unwrap_or_else(|_| {
            // Fallback to embedded icon
            Image::from_bytes(include_bytes!("../icons/32x32.png")).expect("Failed to load tray icon")
        }))
        .tooltip("AxeOS Live! - Mining Monitor")
        .menu(&menu)
        .show_menu_on_left_click(false)
        .on_menu_event(|app, event| {
          match event.id.as_ref() {
            "show" => {
              if let Some(window) = app.get_webview_window("main") {
                let _ = window.show();
                let _ = window.set_focus();
              }
            }
            "analytics" => {
              // Open analytics window
              if let Some(window) = app.get_webview_window("analytics") {
                let _ = window.set_focus();
              } else {
                let url = WebviewUrl::App("analytics".into());
                let _ = WebviewWindowBuilder::new(app, "analytics", url)
                  .title("Mining Analytics - AxeOS Live!")
                  .inner_size(1200.0, 800.0)
                  .min_inner_size(800.0, 600.0)
                  .resizable(true)
                  .center()
                  .build();
              }
            }
            "quit" => {
              app.exit(0);
            }
            _ => {}
          }
        })
        .on_tray_icon_event(|tray, event| {
          // Left click shows the window
          if let TrayIconEvent::Click { button: MouseButton::Left, button_state: MouseButtonState::Up, .. } = event {
            let app = tray.app_handle();
            if let Some(window) = app.get_webview_window("main") {
              let _ = window.show();
              let _ = window.set_focus();
            }
          }
        })
        .build(app)?;

      // Store tray icon in app state so it doesn't get dropped
      app.manage(tray_icon);

      Ok(())
    })
    .on_window_event(|window, event| {
      // Intercept close request on main window - hide to tray instead
      if let tauri::WindowEvent::CloseRequested { api, .. } = event {
        if window.label() == "main" {
          // Prevent the window from closing
          api.prevent_close();
          // Hide the window instead
          let _ = window.hide();
        }
      }
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
