use std::sync::atomic::{AtomicBool, AtomicU64, Ordering};
use tauri::{
    tray::{MouseButtonState, TrayIconBuilder, TrayIconEvent},
    ActivationPolicy, AppHandle, Manager,
};

/// Tracks current connectivity state to avoid redundant updates.
static IS_CONNECTED: AtomicBool = AtomicBool::new(true);

/// Whether a delayed hide is pending (used to cancel on re-focus).
static HIDE_PENDING: AtomicBool = AtomicBool::new(false);

/// Whether the window has been positioned at least once (first show centers it).
static HAS_POSITIONED: AtomicBool = AtomicBool::new(false);

/// Timestamp (ms) of last tray-triggered show, used to suppress immediate blur.
static LAST_TRAY_SHOW: AtomicU64 = AtomicU64::new(0);

fn now_ms() -> u64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as u64
}

pub const TRAY_ID: &str = "herzies-tray";

pub fn setup_tray(app: &AppHandle) -> tauri::Result<()> {
    let _tray = TrayIconBuilder::with_id(TRAY_ID)
        .title("<3")
        .tooltip("Herzies")
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click {
                button_state: MouseButtonState::Up,
                ..
            } = event
            {
                toggle_window(tray.app_handle());
            }
        })
        .build(app)?;

    Ok(())
}

/// Update the tray title based on connectivity state.
/// `connected` = true shows `<3`, false shows `</3`.
pub fn set_connected(app: &AppHandle, connected: bool) {
    let was_connected = IS_CONNECTED.swap(connected, Ordering::Relaxed);
    if was_connected == connected {
        return;
    }

    let title = if connected { "<3" } else { "</3" };
    if let Some(tray) = app.tray_by_id(TRAY_ID) {
        let _ = tray.set_title(Some(title));
    }
}

pub fn toggle_window(app: &AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        if window.is_visible().unwrap_or(false) {
            hide_window(app, &window);
        } else {
            show_window(app, &window);
        }
    }
}

fn show_window(app: &AppHandle, window: &tauri::WebviewWindow) {
    HIDE_PENDING.store(false, Ordering::Relaxed);
    LAST_TRAY_SHOW.store(now_ms(), Ordering::Relaxed);
    // Switch to Regular so the app can take focus
    let _ = app.set_activation_policy(ActivationPolicy::Regular);
    // Only center on first show; after that, respect user's chosen position
    if !HAS_POSITIONED.swap(true, Ordering::Relaxed) {
        let _ = window.center();
    }
    let _ = window.show();
    let _ = window.set_focus();
}

fn hide_window(app: &AppHandle, window: &tauri::WebviewWindow) {
    let _ = window.hide();
    // Switch back to Accessory (no dock icon)
    let _ = app.set_activation_policy(ActivationPolicy::Accessory);
}

/// Called when the window gains focus — cancels any pending hide.
pub fn on_focus() {
    HIDE_PENDING.store(false, Ordering::Relaxed);
}

/// Called when the window loses focus.
/// Schedules a delayed hide so that tray-click re-focus can cancel it.
pub fn on_blur(app: &AppHandle) {
    // Suppress blur if the window was just shown via tray click (within 500ms).
    // This prevents the mouse-release on the tray icon from immediately hiding the window.
    let elapsed = now_ms().saturating_sub(LAST_TRAY_SHOW.load(Ordering::Relaxed));
    if elapsed < 500 {
        return;
    }

    HIDE_PENDING.store(true, Ordering::Relaxed);
    let app = app.clone();

    std::thread::spawn(move || {
        std::thread::sleep(std::time::Duration::from_millis(200));
        if HIDE_PENDING.swap(false, Ordering::Relaxed) {
            if let Some(window) = app.get_webview_window("main") {
                hide_window(&app, &window);
            }
        }
    });
}
