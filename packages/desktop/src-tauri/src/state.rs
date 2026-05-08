use crate::types::*;
use std::sync::Mutex;

pub struct ManagedState {
    pub herzie: Option<Herzie>,
    pub pending_minutes: f64,
    pub current_now_playing: Option<NowPlayingDisplay>,
    pub current_genres: Vec<String>,
    pub is_connected: bool,
}

impl ManagedState {
    pub fn new(herzie: Option<Herzie>) -> Self {
        Self {
            herzie,
            pending_minutes: 0.0,
            current_now_playing: None,
            current_genres: Vec::new(),
            is_connected: true,
        }
    }

    pub fn to_app_state(&self, version: &str) -> AppState {
        AppState {
            herzie: self.herzie.clone(),
            now_playing: self.current_now_playing.clone(),
            multipliers: crate::storage::load_multipliers(),
            is_online: crate::api::is_logged_in(),
            is_connected: self.is_connected,
            version: version.to_string(),
        }
    }
}

pub type SharedState = Mutex<ManagedState>;
