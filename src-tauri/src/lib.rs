use serde::{Deserialize, Serialize};
use std::net::IpAddr;
use std::time::Duration;
use tauri::{AppHandle, Manager, WebviewUrl, WebviewWindowBuilder};
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
      scan_network,
      get_local_subnet
    ])
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
