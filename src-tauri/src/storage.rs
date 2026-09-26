use std::fs;
use std::path::{Path, PathBuf};
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct NoteFileInfo {
    pub name: String,
    pub path: String,
    pub size_bytes: u64,
    pub modified_ms: u64,
}

pub fn get_data_dir() -> PathBuf {
    // 1. In dev mode or when ./data exists in current working directory, use it
    let current_dir = std::env::current_dir().unwrap_or_else(|_| PathBuf::from("."));
    let local_data = current_dir.join("data");
    if local_data.exists() {
        return local_data;
    }
    let src_tauri_data = current_dir.join("src-tauri").join("data");
    if src_tauri_data.exists() {
        return src_tauri_data;
    }

    // 2. In production, always locate data next to the executable for portability
    if let Ok(exe_path) = std::env::current_exe() {
        if let Some(exe_dir) = exe_path.parent() {
            return exe_dir.join("data");
        }
    }

    local_data
}

pub fn ensure_directories() -> Result<PathBuf, String> {
    let data_dir = get_data_dir();
    let profiles_dir = data_dir.join("profiles");
    let notes_dir = data_dir.join("notes");
    let images_dir = data_dir.join("images");

    fs::create_dir_all(&data_dir).map_err(|e| format!("Failed to create data dir: {e}"))?;
    fs::create_dir_all(&profiles_dir).map_err(|e| format!("Failed to create profiles dir: {e}"))?;
    fs::create_dir_all(&notes_dir).map_err(|e| format!("Failed to create notes dir: {e}"))?;
    fs::create_dir_all(&images_dir).map_err(|e| format!("Failed to create images dir: {e}"))?;

    // Create default config if not exists
    let config_path = data_dir.join("config.json");
    if !config_path.exists() {
        let default_config = r#"{
  "firstRun": true,
  "activeProfile": "default",
  "mainOpacity": 90,
  "pipOpacity": 100,
  "pipVolume": 80,
  "hotkeys": {
    "ghostModeMain": "Alt+G",
    "ghostModePip": "Alt+L",
    "bossKey": "Alt+H",
    "playPausePip": "Alt+P",
    "hoverTranslate": "Alt+T",
    "snipperTool": "Alt+S",
    "quickSearch": "Ctrl+Space"
  },
  "timerPresets": [
    { "id": "p1", "label": "+1 мин", "seconds": 60 },
    { "id": "p2", "label": "+5 мин", "seconds": 300 },
    { "id": "p3", "label": "Босс", "seconds": 900 },
    { "id": "p4", "label": "Респаун руды", "seconds": 1800 }
  ]
}"#;
        let _ = fs::write(&config_path, default_config);
    }

    // Create default profile if not exists
    let default_profile_path = profiles_dir.join("default.json");
    if !default_profile_path.exists() {
        let default_profile = r#"{
  "id": "default",
  "name": "Основной",
  "tabs": [
    { "id": "note-1", "title": "Заметка 1", "filePath": "note_1.md" }
  ],
  "activeTabId": "note-1"
}"#;
        let _ = fs::write(&default_profile_path, default_profile);
    }

    // Create clean starter note if not exists
    let initial_note_path = notes_dir.join("note_1.md");
    if !initial_note_path.exists() {
        let initial_note = "# Новая заметка\n\n";
        let _ = fs::write(&initial_note_path, initial_note);
    }

    Ok(data_dir)
}

pub fn read_notes_dir() -> Result<Vec<NoteFileInfo>, String> {
    let data_dir = ensure_directories()?;
    let notes_dir = data_dir.join("notes");

    let mut results = Vec::new();
    let entries = fs::read_dir(&notes_dir)
        .map_err(|e| format!("Failed to read notes directory: {e}"))?;

    for entry in entries.flatten() {
        let path = entry.path();
        if path.is_file() {
            let name = path.file_name()
                .map(|n| n.to_string_lossy().to_string())
                .unwrap_or_default();
            let metadata = entry.metadata().ok();
            let size_bytes = metadata.as_ref().map(|m| m.len()).unwrap_or(0);
            let modified_ms = metadata
                .and_then(|m| m.modified().ok())
                .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
                .map(|d| d.as_millis() as u64)
                .unwrap_or(0);

            results.push(NoteFileInfo {
                name,
                path: path.to_string_lossy().to_string(),
                size_bytes,
                modified_ms,
            });
        }
    }

    results.sort_by(|a, b| b.modified_ms.cmp(&a.modified_ms));
    Ok(results)
}

pub fn save_note(file_name_or_path: &str, content: &str) -> Result<(), String> {
    let data_dir = ensure_directories()?;
    let notes_dir = data_dir.join("notes");

    let target_path = if Path::new(file_name_or_path).is_absolute() {
        PathBuf::from(file_name_or_path)
    } else {
        notes_dir.join(file_name_or_path)
    };

    fs::write(&target_path, content)
        .map_err(|e| format!("Failed to write note file {:?}: {e}", target_path))?;

    Ok(())
}

pub fn read_note(file_name_or_path: &str) -> Result<String, String> {
    let data_dir = ensure_directories()?;
    let notes_dir = data_dir.join("notes");

    let target_path = if Path::new(file_name_or_path).is_absolute() {
        PathBuf::from(file_name_or_path)
    } else {
        notes_dir.join(file_name_or_path)
    };

    if !target_path.exists() {
        return Ok(String::new());
    }

    fs::read_to_string(&target_path)
        .map_err(|e| format!("Failed to read note file {:?}: {e}", target_path))
}

pub fn delete_note(file_name_or_path: &str) -> Result<(), String> {
    let data_dir = ensure_directories()?;
    let notes_dir = data_dir.join("notes");

    let target_path = if Path::new(file_name_or_path).is_absolute() {
        PathBuf::from(file_name_or_path)
    } else {
        notes_dir.join(file_name_or_path)
    };

    if target_path.exists() {
        fs::remove_file(&target_path)
            .map_err(|e| format!("Failed to delete note file {:?}: {e}", target_path))?;
    }

    Ok(())
}

pub fn load_config_json() -> Result<String, String> {
    let data_dir = ensure_directories()?;
    let config_path = data_dir.join("config.json");
    if !config_path.exists() {
        return Ok("{}".to_string());
    }
    fs::read_to_string(&config_path)
        .map_err(|e| format!("Failed to read config: {e}"))
}

pub fn save_config_json(content: &str) -> Result<(), String> {
    let data_dir = ensure_directories()?;
    let config_path = data_dir.join("config.json");
    fs::write(&config_path, content)
        .map_err(|e| format!("Failed to write config: {e}"))
}

pub fn list_profile_names() -> Result<Vec<String>, String> {
    let data_dir = ensure_directories()?;
    let profiles_dir = data_dir.join("profiles");
    let mut names = Vec::new();

    if let Ok(entries) = fs::read_dir(profiles_dir) {
        for entry in entries.flatten() {
            let path = entry.path();
            if path.is_file() && path.extension().map_or(false, |ext| ext == "json") {
                if let Some(stem) = path.file_stem() {
                    names.push(stem.to_string_lossy().to_string());
                }
            }
        }
    }

    names.sort();
    Ok(names)
}

pub fn load_profile_json(name: &str) -> Result<String, String> {
    let data_dir = ensure_directories()?;
    let profile_name = if name.ends_with(".json") {
        name.to_string()
    } else {
        format!("{name}.json")
    };
    let profile_path = data_dir.join("profiles").join(profile_name);

    if !profile_path.exists() {
        return Ok("{}".to_string());
    }

    fs::read_to_string(&profile_path)
        .map_err(|e| format!("Failed to read profile: {e}"))
}

pub fn save_profile_json(name: &str, content: &str) -> Result<(), String> {
    let data_dir = ensure_directories()?;
    let profile_name = if name.ends_with(".json") {
        name.to_string()
    } else {
        format!("{name}.json")
    };
    let profile_path = data_dir.join("profiles").join(profile_name);

    fs::write(&profile_path, content)
        .map_err(|e| format!("Failed to write profile: {e}"))
}

pub fn delete_profile_json(name: &str) -> Result<(), String> {
    if name == "default" {
        return Err("Нельзя удалить основной профиль 'default'".to_string());
    }
    let data_dir = ensure_directories()?;
    let profile_name = if name.ends_with(".json") {
        name.to_string()
    } else {
        format!("{name}.json")
    };
    let profile_path = data_dir.join("profiles").join(profile_name);

    if profile_path.exists() {
        fs::remove_file(&profile_path)
            .map_err(|e| format!("Failed to delete profile: {e}"))?;
    }
    Ok(())
}
