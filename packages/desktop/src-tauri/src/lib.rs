mod api;
mod auth;
mod game;
mod nowplaying;
mod state;
mod storage;
mod tray;
mod types;

use reqwest::Client;
use state::{ManagedState, SharedState};
use std::sync::Mutex;
use std::time::Duration;
use tauri::{AppHandle, Emitter, Manager};
use tauri_plugin_autostart::MacosLauncher;
use types::*;

// --- Tauri commands ---

#[tauri::command]
fn get_state(state: tauri::State<SharedState>) -> AppState {
    let s = state.lock().unwrap();
    s.to_app_state(env!("CARGO_PKG_VERSION"))
}

#[tauri::command]
async fn login(app: AppHandle) -> Result<bool, String> {
    Ok(auth::login(&app).await)
}

#[tauri::command]
fn logout(app: AppHandle, state: tauri::State<SharedState>) {
    storage::clear_session();
    let s = state.lock().unwrap();
    let app_state = s.to_app_state(env!("CARGO_PKG_VERSION"));
    drop(s);
    let _ = app.emit("state-update", &app_state);
}

#[tauri::command]
async fn friend_add(
    code: String,
    app: AppHandle,
    state: tauri::State<'_, SharedState>,
) -> Result<FriendResult, String> {
    let (friend_code, friend_codes_len, already_has) = {
        let s = state.lock().unwrap();
        let herzie = match &s.herzie {
            Some(h) => h,
            None => {
                return Ok(FriendResult {
                    success: false,
                    message: "No herzie".into(),
                })
            }
        };
        (
            herzie.friend_code.clone(),
            herzie.friend_codes.len(),
            herzie.friend_codes.contains(&code),
        )
    };

    let re = regex_lite::Regex::new(r"^HERZ-[A-Z0-9]{4}$").unwrap();
    if !re.is_match(&code) {
        return Ok(FriendResult {
            success: false,
            message: "Invalid code format".into(),
        });
    }
    if code == friend_code {
        return Ok(FriendResult {
            success: false,
            message: "Can't add yourself".into(),
        });
    }
    if already_has {
        return Ok(FriendResult {
            success: false,
            message: "Already friends".into(),
        });
    }
    if friend_codes_len >= 20 {
        return Ok(FriendResult {
            success: false,
            message: "Friend list full (max 20)".into(),
        });
    }

    let client = Client::new();
    let ok = api::api_add_friend(&client, &friend_code, &code).await;
    if ok {
        let mut s = state.lock().unwrap();
        if let Some(ref mut herzie) = s.herzie {
            herzie.friend_codes.push(code.clone());
            storage::save_herzie(herzie);
            let app_state = s.to_app_state(env!("CARGO_PKG_VERSION"));
            drop(s);
            let _ = app.emit("state-update", &app_state);
        }
        let _ = app.emit("activity", format!("Added friend {}", code));
        Ok(FriendResult {
            success: true,
            message: "Friend added!".into(),
        })
    } else {
        Ok(FriendResult {
            success: false,
            message: "Friend code not found".into(),
        })
    }
}

#[tauri::command]
async fn friend_remove(
    code: String,
    app: AppHandle,
    state: tauri::State<'_, SharedState>,
) -> Result<FriendResult, String> {
    let friend_code = {
        let s = state.lock().unwrap();
        match &s.herzie {
            Some(h) => h.friend_code.clone(),
            None => {
                return Ok(FriendResult {
                    success: false,
                    message: "No herzie".into(),
                })
            }
        }
    };

    let client = Client::new();
    let ok = api::api_remove_friend(&client, &friend_code, &code).await;
    if ok {
        let mut s = state.lock().unwrap();
        if let Some(ref mut herzie) = s.herzie {
            herzie.friend_codes.retain(|c| c != &code);
            storage::save_herzie(herzie);
            let app_state = s.to_app_state(env!("CARGO_PKG_VERSION"));
            drop(s);
            let _ = app.emit("state-update", &app_state);
        }
        let _ = app.emit("activity", format!("Removed friend {}", code));
        Ok(FriendResult {
            success: true,
            message: "Friend removed".into(),
        })
    } else {
        Ok(FriendResult {
            success: false,
            message: "Failed to remove friend".into(),
        })
    }
}

#[tauri::command]
async fn friend_lookup(
    codes: Vec<String>,
) -> Result<std::collections::HashMap<String, HerzieProfile>, String> {
    let client = Client::new();
    Ok(api::api_lookup_herzies(&client, &codes).await)
}

#[tauri::command]
async fn fetch_inventory(
    _state: tauri::State<'_, SharedState>,
) -> Result<Option<InventoryResult>, String> {
    if !api::is_logged_in() {
        return Ok(None);
    }
    let client = Client::new();
    match api::api_fetch_inventory(&client).await {
        Some((inventory, currency)) => Ok(Some(InventoryResult {
            inventory,
            currency,
        })),
        None => Ok(None),
    }
}

#[tauri::command]
async fn sell_item(
    item_id: String,
    quantity: u32,
    app: AppHandle,
    state: tauri::State<'_, SharedState>,
) -> Result<Option<serde_json::Value>, String> {
    let client = Client::new();
    let result = api::api_sell_item(&client, &item_id, quantity).await;
    if let Some(ref data) = result {
        if let Some(new_currency) = data["newCurrency"].as_u64() {
            let mut s = state.lock().unwrap();
            if let Some(ref mut herzie) = s.herzie {
                herzie.currency = new_currency as u32;
                storage::save_herzie(herzie);
                let app_state = s.to_app_state(env!("CARGO_PKG_VERSION"));
                drop(s);
                let _ = app.emit("state-update", &app_state);
            }
        }
    }
    Ok(result)
}

#[tauri::command]
async fn trade_create(target_code: String) -> Result<Option<serde_json::Value>, String> {
    let client = Client::new();
    Ok(api::api_create_trade(&client, &target_code).await)
}

#[tauri::command]
async fn trade_join(trade_id: String) -> Result<bool, String> {
    let client = Client::new();
    Ok(api::api_join_trade(&client, &trade_id).await)
}

#[tauri::command]
async fn trade_offer(trade_id: String, offer: TradeOffer) -> Result<bool, String> {
    let client = Client::new();
    Ok(api::api_update_trade_offer(&client, &trade_id, &offer).await)
}

#[tauri::command]
async fn trade_lock(trade_id: String) -> Result<bool, String> {
    let client = Client::new();
    Ok(api::api_lock_trade(&client, &trade_id).await)
}

#[tauri::command]
async fn trade_accept(trade_id: String) -> Result<Option<serde_json::Value>, String> {
    let client = Client::new();
    Ok(api::api_accept_trade(&client, &trade_id).await)
}

#[tauri::command]
async fn trade_cancel(trade_id: String) -> Result<bool, String> {
    let client = Client::new();
    Ok(api::api_cancel_trade(&client, &trade_id).await)
}

#[tauri::command]
async fn trade_poll(trade_id: String) -> Result<Option<Trade>, String> {
    let client = Client::new();
    Ok(api::api_poll_trade(&client, &trade_id).await)
}

// --- Helper types for command results ---

#[derive(serde::Serialize)]
struct FriendResult {
    success: bool,
    message: String,
}

#[derive(serde::Serialize)]
struct InventoryResult {
    inventory: Inventory,
    currency: u32,
}

// --- Background loops ---

async fn poll_loop(app: AppHandle) {
    let client = Client::new();
    let mut interval = tokio::time::interval(Duration::from_secs(3));

    loop {
        interval.tick().await;
        if let Err(e) = poll_tick(&app, &client).await {
            log::warn!("Poll error: {}", e);
        }
    }
}

async fn poll_tick(app: &AppHandle, _client: &Client) -> Result<(), String> {
    let state = app.state::<SharedState>();

    let has_herzie = {
        let s = state.lock().unwrap();
        s.herzie.is_some()
    };

    if !has_herzie {
        return Ok(());
    }

    let np = nowplaying::get_now_playing().await;

    // Collect notification info to send after releasing the lock
    let mut notify_level_up: Option<(String, u32)> = None;
    let mut notify_evolved: Option<(String, u32)> = None;

    {
        let mut s = state.lock().unwrap();
        if s.herzie.is_none() {
            return Ok(());
        }

        match np {
            Some(ref info) if info.is_playing && !info.title.is_empty() && info.volume > 0 => {
                let np_display = NowPlayingDisplay {
                    title: info.title.clone(),
                    artist: info.artist.clone(),
                };
                let genres = if info.genre.is_empty() {
                    vec![]
                } else {
                    vec![info.genre.clone()]
                };

                let minutes = 3.0 / 60.0; // 3 seconds = 0.05 minutes
                if minutes > 0.01 {
                    s.pending_minutes += minutes;

                    let genre_list = if info.genre.is_empty() {
                        vec![]
                    } else {
                        vec![info.genre.clone()]
                    };
                    let classified = if !genre_list.is_empty() {
                        game::classify_genre(&genre_list)
                    } else {
                        game::classify_genre(&["pop".to_string()])
                    };

                    // Work with herzie directly
                    let herzie = s.herzie.as_mut().unwrap();
                    let craving = game::get_daily_craving(&herzie.id, None);
                    let is_craving =
                        !genre_list.is_empty() && game::matches_craving(&genre_list, &craving);

                    let xp = game::calculate_xp_gain(
                        minutes,
                        herzie.friend_codes.len(),
                        is_craving,
                        &[],
                    );
                    let events = game::apply_xp(herzie, xp);
                    herzie.total_minutes_listened += minutes;
                    game::record_genre_minutes(&mut herzie.genre_minutes, &classified, minutes);
                    storage::save_herzie(herzie);

                    if events.leveled_up {
                        notify_level_up = Some((herzie.name.clone(), herzie.level));
                    }
                    if events.evolved {
                        if let Some(new_stage) = events.new_stage {
                            notify_evolved = Some((herzie.name.clone(), new_stage));
                        }
                    }
                }

                s.current_now_playing = Some(np_display);
                s.current_genres = genres;
            }
            _ => {
                s.current_now_playing = None;
                s.current_genres.clear();
            }
        }
    }

    // Send notifications outside the lock
    if let Some((name, level)) = notify_level_up {
        let msg = format!("{} is now level {}!", name, level);
        send_notification(app, "Level Up!", &msg);
        let _ = app.emit("activity", format!("Level Up! {}", msg));
    }
    if let Some((name, stage)) = notify_evolved {
        let msg = format!("{} evolved to Stage {}!", name, stage);
        send_notification(app, "Evolution!", &msg);
        let _ = app.emit("activity", format!("Evolution! {}", msg));
    }

    let app_state = {
        let s = state.lock().unwrap();
        s.to_app_state(env!("CARGO_PKG_VERSION"))
    };
    let _ = app.emit("state-update", &app_state);

    Ok(())
}

#[tauri::command]
fn test_notification(app: AppHandle) {
    send_notification(&app, "Test", "Notifications are working!");
}

fn send_notification(app: &AppHandle, title: &str, body: &str) {
    use tauri_plugin_notification::NotificationExt;
    let _ = app.notification().builder().title(title).body(body).show();
}

async fn sync_loop(app: AppHandle) {
    let client = Client::new();
    let mut interval = tokio::time::interval(Duration::from_secs(10));

    loop {
        interval.tick().await;
        if let Err(e) = sync_tick(&app, &client).await {
            log::warn!("Sync error: {}", e);
        }
    }
}

async fn sync_tick(app: &AppHandle, client: &Client) -> Result<(), String> {
    let state = app.state::<SharedState>();

    let (has_herzie, is_logged_in, minutes_to_sync, np_payload, genres) = {
        let s = state.lock().unwrap();
        let has = s.herzie.is_some();
        let logged = api::is_logged_in();
        let mins = s.pending_minutes.min(10.0);
        let np = s.current_now_playing.as_ref().map(|np| NowPlayingPayload {
            title: np.title.clone(),
            artist: np.artist.clone(),
            genre: s.current_genres.first().cloned(),
        });
        let g = s.current_genres.clone();
        (has, logged, mins, np, g)
    };

    // Check actual internet connectivity independently
    let reachable = api::is_reachable(client).await;
    let connected = is_logged_in && reachable;
    tray::set_connected(app, connected);

    if !has_herzie || !is_logged_in {
        let mut s = state.lock().unwrap();
        s.is_connected = connected;
        let app_state = s.to_app_state(env!("CARGO_PKG_VERSION"));
        drop(s);
        let _ = app.emit("state-update", &app_state);
        return Ok(());
    }

    let result = api::api_sync(client, np_payload, minutes_to_sync, genres).await;

    if let Some(sync_resp) = result {
        let mut s = state.lock().unwrap();
        s.is_connected = connected;
        s.pending_minutes = (s.pending_minutes - minutes_to_sync).max(0.0);

        if let Some(ref mut herzie) = s.herzie {
            let server = &sync_resp.herzie;
            herzie.xp = server.xp;
            herzie.level = server.level;
            herzie.stage = server.stage;
            herzie.total_minutes_listened = server.total_minutes_listened;
            herzie.genre_minutes = server.genre_minutes.clone();
            herzie.friend_codes = server.friend_codes.clone();
            herzie.streak_days = server.streak_days;
            herzie.streak_last_date = server.streak_last_date.clone();
            herzie.currency = server.currency;
            storage::save_herzie(herzie);
        }

        storage::save_multipliers(&sync_resp.multipliers);

        let app_state = s.to_app_state(env!("CARGO_PKG_VERSION"));
        drop(s);
        let _ = app.emit("state-update", &app_state);

        // Show notification for incoming trade requests
        if let Some(trade_req) = &sync_resp.pending_trade_request {
            let msg = format!("{} wants to trade with you!", trade_req.from_name);
            send_notification(app, "Trade Request", &msg);
            let _ = app.emit("activity", format!("Trade Request: {}", msg));
        }

        // Show server-sent notifications (item drops, etc.)
        for notif in &sync_resp.notifications {
            send_notification(app, &notif.title, &notif.message);
            let _ = app.emit("activity", format!("{}: {}", notif.title, notif.message));
        }
    } else {
        let mut s = state.lock().unwrap();
        s.is_connected = connected;
        let app_state = s.to_app_state(env!("CARGO_PKG_VERSION"));
        drop(s);
        let _ = app.emit("state-update", &app_state);
    }

    Ok(())
}

// --- Tauri setup ---

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let herzie = storage::load_herzie();
    log::info!(
        "Loaded herzie: {}",
        herzie.as_ref().map(|h| h.name.as_str()).unwrap_or("null")
    );

    tauri::Builder::default()
        .plugin(tauri_plugin_autostart::init(
            MacosLauncher::LaunchAgent,
            None,
        ))
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            // Show window when second instance tries to launch
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.show();
                let _ = window.set_focus();
            }
        }))
        .manage(Mutex::new(ManagedState::new(herzie)) as SharedState)
        .invoke_handler(tauri::generate_handler![
            get_state,
            login,
            logout,
            friend_add,
            friend_remove,
            friend_lookup,
            fetch_inventory,
            sell_item,
            trade_create,
            trade_join,
            trade_offer,
            trade_lock,
            trade_accept,
            trade_cancel,
            trade_poll,
            test_notification,
        ])
        .setup(|app| {
            // Hide dock icon (menu bar only)
            #[cfg(target_os = "macos")]
            app.set_activation_policy(tauri::ActivationPolicy::Accessory);

            // Set up tray icon
            tray::setup_tray(app.handle())?;

            // Set up window hide-on-blur (production only)
            if std::env::var("TAURI_DEV").is_err() {
                if let Some(window) = app.get_webview_window("main") {
                    let app_handle = app.handle().clone();
                    window.on_window_event(move |event| match event {
                        tauri::WindowEvent::Focused(false) => {
                            tray::on_blur(&app_handle);
                        }
                        tauri::WindowEvent::Focused(true) => {
                            tray::on_focus();
                        }
                        _ => {}
                    });
                }
            } else {
                // In dev, show window immediately
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.center();
                    let _ = window.show();
                }
            }

            // Enable autostart
            {
                use tauri_plugin_autostart::ManagerExt;
                let autostart = app.autolaunch();
                let _ = autostart.enable();
            }

            // Start background loops
            let app_handle = app.handle().clone();
            tauri::async_runtime::spawn(poll_loop(app_handle));

            let app_handle = app.handle().clone();
            tauri::async_runtime::spawn(sync_loop(app_handle));

            // Initial poll + sync
            let app_handle = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                let client = Client::new();
                let _ = poll_tick(&app_handle, &client).await;
                let _ = sync_tick(&app_handle, &client).await;
            });

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
