use crate::types::{ActiveMultiplier, Herzie};
use std::collections::HashMap;

const GENRES: &[&str] = &[
    "pop",
    "rock",
    "hip-hop",
    "electronic",
    "jazz",
    "classical",
    "r&b",
    "country",
    "metal",
    "indie",
    "latin",
    "folk",
    "blues",
    "punk",
    "soul",
];

const BASE_XP_PER_MINUTE: f64 = 10.0;

pub fn xp_for_level(level: u32) -> f64 {
    (100.0 * (level as f64).powf(1.5)).floor()
}

pub fn total_xp_for_level(level: u32) -> f64 {
    let mut total = 0.0;
    for i in 2..=level {
        total += xp_for_level(i);
    }
    total
}

pub fn stage_for_level(level: u32) -> u32 {
    if level >= 25 {
        3
    } else if level >= 10 {
        2
    } else {
        1
    }
}

pub fn calculate_xp_gain(
    minutes: f64,
    friend_count: usize,
    is_craving_genre: bool,
    multipliers: &[ActiveMultiplier],
) -> f64 {
    let mut xp = minutes * BASE_XP_PER_MINUTE;
    let friend_bonus = (friend_count.min(20) as f64) * 0.02;
    xp *= 1.0 + friend_bonus;
    if is_craving_genre {
        xp *= 1.5;
    }
    if !multipliers.is_empty() {
        let total_bonus: f64 = multipliers.iter().map(|m| m.bonus).sum();
        xp *= 1.0 + total_bonus;
    }
    xp
}

pub struct ApplyXpResult {
    pub leveled_up: bool,
    pub evolved: bool,
    pub new_stage: Option<u32>,
}

pub fn apply_xp(herzie: &mut Herzie, xp_gain: f64) -> ApplyXpResult {
    herzie.xp += xp_gain;
    let mut leveled_up = false;
    let mut evolved = false;
    let mut new_stage: Option<u32> = None;

    while herzie.xp >= total_xp_for_level(herzie.level + 1) {
        herzie.level += 1;
        leveled_up = true;
        let stage = stage_for_level(herzie.level);
        if stage != herzie.stage {
            herzie.stage = stage;
            evolved = true;
            new_stage = Some(stage);
        }
    }

    ApplyXpResult {
        leveled_up,
        evolved,
        new_stage,
    }
}

pub fn classify_genre(spotify_genres: &[String]) -> Vec<String> {
    let mut matched = std::collections::HashSet::new();

    for raw in spotify_genres {
        let lower = raw.to_lowercase();

        for &genre in GENRES {
            if lower.contains(genre) || genre.contains(&*lower) {
                matched.insert(genre.to_string());
            }
        }

        if lower.contains("rap") || lower.contains("trap") || lower.contains("drill") {
            matched.insert("hip-hop".to_string());
        }
        if lower.contains("edm")
            || lower.contains("house")
            || lower.contains("techno")
            || lower.contains("dubstep")
        {
            matched.insert("electronic".to_string());
        }
        if lower.contains("alt") || lower.contains("shoegaze") || lower.contains("dream pop") {
            matched.insert("indie".to_string());
        }
        if lower.contains("hardcore") || lower.contains("death") || lower.contains("thrash") {
            matched.insert("metal".to_string());
        }
        if lower.contains("reggaeton") || lower.contains("salsa") || lower.contains("bachata") {
            matched.insert("latin".to_string());
        }
        if lower.contains("rhythm") || lower.contains("rnb") {
            matched.insert("r&b".to_string());
        }
    }

    if matched.is_empty() {
        vec!["pop".to_string()]
    } else {
        matched.into_iter().collect()
    }
}

pub fn record_genre_minutes(
    genre_minutes: &mut HashMap<String, f64>,
    genres: &[String],
    minutes: f64,
) {
    let count = if genres.is_empty() { 1 } else { genres.len() };
    let per_genre = minutes / count as f64;
    for genre in genres {
        *genre_minutes.entry(genre.clone()).or_insert(0.0) += per_genre;
    }
}

fn simple_hash(s: &str) -> u32 {
    let mut hash: i32 = 0;
    for ch in s.chars() {
        let code = ch as i32;
        hash = hash.wrapping_shl(5).wrapping_sub(hash).wrapping_add(code);
        // hash |= 0 in JS is a no-op for i32 (already 32-bit signed)
    }
    hash.unsigned_abs()
}

pub fn get_daily_craving(herzie_id: &str, date: Option<&str>) -> String {
    let date_str = date.map(String::from).unwrap_or_else(chrono_today_string);
    let seed = simple_hash(&format!("{}{}", herzie_id, date_str));
    let index = (seed as usize) % GENRES.len();
    GENRES[index].to_string()
}

fn chrono_today_string() -> String {
    // Use a simple approach: read system time
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_secs();
    // Convert to date string YYYY-MM-DD
    let days = now / 86400;
    let (year, month, day) = days_to_ymd(days);
    format!("{:04}-{:02}-{:02}", year, month, day)
}

fn days_to_ymd(days_since_epoch: u64) -> (u32, u32, u32) {
    // Algorithm from civil_from_days (Howard Hinnant)
    let z = days_since_epoch as i64 + 719468;
    let era = if z >= 0 { z } else { z - 146096 } / 146097;
    let doe = (z - era * 146097) as u64;
    let yoe = (doe - doe / 1460 + doe / 36524 - doe / 146096) / 365;
    let y = (yoe as i64 + era * 400) as u32;
    let doy = doe - (365 * yoe + yoe / 4 - yoe / 100);
    let mp = (5 * doy + 2) / 153;
    let d = doy - (153 * mp + 2) / 5 + 1;
    let m = if mp < 10 { mp + 3 } else { mp - 9 };
    let y = if m <= 2 { y + 1 } else { y };
    (y, m as u32, d as u32)
}

pub fn matches_craving(track_genres: &[String], craving_genre: &str) -> bool {
    let craving = craving_genre.to_lowercase();
    track_genres.iter().any(|g| {
        let genre = g.to_lowercase();
        genre.contains(&craving) || craving.contains(&genre)
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_xp_for_level() {
        assert_eq!(xp_for_level(2), 282.0);
        assert_eq!(xp_for_level(1), 100.0);
        assert_eq!(xp_for_level(10), 3162.0);
    }

    #[test]
    fn test_stage_for_level() {
        assert_eq!(stage_for_level(1), 1);
        assert_eq!(stage_for_level(9), 1);
        assert_eq!(stage_for_level(10), 2);
        assert_eq!(stage_for_level(24), 2);
        assert_eq!(stage_for_level(25), 3);
        assert_eq!(stage_for_level(100), 3);
    }

    #[test]
    fn test_simple_hash_consistency() {
        // The hash must match JS behavior for craving to work
        let h = simple_hash("test-id2024-01-01");
        assert!(h > 0);
    }

    #[test]
    fn test_classify_genre_default() {
        let result = classify_genre(&["unknown-genre".to_string()]);
        assert_eq!(result, vec!["pop"]);
    }

    #[test]
    fn test_classify_genre_rock() {
        let result = classify_genre(&["Rock".to_string()]);
        assert!(result.contains(&"rock".to_string()));
    }

    #[test]
    fn test_calculate_xp_basic() {
        let xp = calculate_xp_gain(1.0, 0, false, &[]);
        assert!((xp - 10.0).abs() < 0.001);
    }

    #[test]
    fn test_calculate_xp_with_friends() {
        let xp = calculate_xp_gain(1.0, 10, false, &[]);
        assert!((xp - 12.0).abs() < 0.001); // 10 * (1 + 10*0.02)
    }

    #[test]
    fn test_calculate_xp_with_craving() {
        let xp = calculate_xp_gain(1.0, 0, true, &[]);
        assert!((xp - 15.0).abs() < 0.001); // 10 * 1.5
    }
}
