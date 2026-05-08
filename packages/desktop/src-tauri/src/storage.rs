use crate::types::{ActiveMultiplier, Herzie, SessionData};
use hmac::{Hmac, Mac};
use sha2::Sha256;
use std::collections::HashMap;
use std::fs;
use std::os::unix::fs::PermissionsExt;
use std::path::PathBuf;

type HmacSha256 = Hmac<Sha256>;

const HMAC_SALT: &str = "hrzs_v1_8f3a2c";

fn config_dir() -> PathBuf {
    dirs::home_dir()
        .expect("No home directory")
        .join(".config")
        .join("herzies")
}

fn ensure_dir() {
    let dir = config_dir();
    if !dir.exists() {
        fs::create_dir_all(&dir).ok();
        fs::set_permissions(&dir, fs::Permissions::from_mode(0o700)).ok();
    }
}

fn write_secure(path: &PathBuf, data: &str) {
    fs::write(path, data).ok();
    fs::set_permissions(path, fs::Permissions::from_mode(0o600)).ok();
}

/// Compute HMAC-SHA256 over cheat-sensitive fields.
/// Field order must match the TypeScript JSON.stringify exactly.
fn compute_signature(herzie: &Herzie) -> String {
    // Build the payload JSON with exact field ordering matching TS
    let payload = serde_json::json!({
        "id": herzie.id,
        "xp": herzie.xp,
        "level": herzie.level,
        "stage": herzie.stage,
        "totalMinutesListened": herzie.total_minutes_listened,
        "genreMinutes": herzie.genre_minutes,
        "currency": herzie.currency,
    });
    let payload_str = serde_json::to_string(&payload).unwrap();

    let key = format!("{}:{}", HMAC_SALT, herzie.id);
    let mut mac = HmacSha256::new_from_slice(key.as_bytes()).unwrap();
    mac.update(payload_str.as_bytes());
    hex::encode(mac.finalize().into_bytes())
}

pub fn load_herzie() -> Option<Herzie> {
    ensure_dir();
    let path = config_dir().join("herzie.json");
    if !path.exists() {
        return None;
    }
    let raw = fs::read_to_string(&path).ok()?;
    let mut value: serde_json::Value = serde_json::from_str(&raw).ok()?;

    let sig = value
        .get("_sig")
        .and_then(|v| v.as_str())
        .map(String::from);

    // Remove _sig before deserializing
    if let Some(obj) = value.as_object_mut() {
        obj.remove("_sig");
    }

    let mut herzie: Herzie = serde_json::from_value(value).ok()?;

    // Verify signature
    match sig {
        Some(s) if s == compute_signature(&herzie) => {}
        _ => {
            // Tampered or unsigned — reset progress
            herzie.xp = 0.0;
            herzie.level = 1;
            herzie.stage = 1;
            herzie.total_minutes_listened = 0.0;
            herzie.genre_minutes = HashMap::new();
        }
    }

    Some(herzie)
}

pub fn save_herzie(herzie: &Herzie) {
    ensure_dir();
    let path = config_dir().join("herzie.json");
    let mut value = serde_json::to_value(herzie).unwrap();
    if let Some(obj) = value.as_object_mut() {
        obj.insert(
            "_sig".to_string(),
            serde_json::Value::String(compute_signature(herzie)),
        );
    }
    let data = serde_json::to_string_pretty(&value).unwrap();
    write_secure(&path, &data);
}

pub fn load_session() -> Option<SessionData> {
    ensure_dir();
    let path = config_dir().join("session.json");
    if !path.exists() {
        return None;
    }
    let raw = fs::read_to_string(&path).ok()?;
    let session: SessionData = serde_json::from_str(&raw).ok()?;
    if session.access_token.is_empty() || session.user_id.is_empty() {
        return None;
    }
    Some(session)
}

pub fn save_session(session: &SessionData) {
    ensure_dir();
    let path = config_dir().join("session.json");
    let data = serde_json::to_string_pretty(session).unwrap();
    write_secure(&path, &data);
}

pub fn clear_session() {
    ensure_dir();
    let path = config_dir().join("session.json");
    if path.exists() {
        write_secure(&path, "{}");
    }
}

pub fn load_multipliers() -> Option<Vec<ActiveMultiplier>> {
    let path = config_dir().join("multipliers.json");
    if !path.exists() {
        return None;
    }
    let raw = fs::read_to_string(&path).ok()?;
    serde_json::from_str(&raw).ok()
}

pub fn save_multipliers(multipliers: &[ActiveMultiplier]) {
    ensure_dir();
    let path = config_dir().join("multipliers.json");
    let data = serde_json::to_string(multipliers).unwrap();
    write_secure(&path, &data);
}
