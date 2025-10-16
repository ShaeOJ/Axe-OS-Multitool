use serde::{Deserialize, Serialize};
use std::time::Duration;

#[derive(Debug, Serialize, Deserialize)]
struct MinerSettingsUpdate {
    frequency: u32,
    #[serde(rename = "coreVoltage")]
    core_voltage: u32,
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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_store::Builder::new().build())
    .invoke_handler(tauri::generate_handler![
      get_miner_data,
      restart_miner,
      update_miner_settings
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
