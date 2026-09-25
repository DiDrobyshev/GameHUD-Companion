mod ocr;
mod capture;
mod storage;
mod network;

use tauri::{
    menu::{Menu, MenuItem},
    tray::{TrayIconBuilder, TrayIconEvent},
    AppHandle, Emitter, Manager, WindowEvent,
};
use tauri_plugin_global_shortcut::{GlobalShortcutExt, Shortcut, ShortcutState};
use serde::{Deserialize, Serialize};
use storage::NoteFileInfo;

#[derive(Debug, Serialize, Deserialize)]
pub struct HoverTranslateResponse {
    pub original_text: String,
    pub translated_text: String,
    pub cursor_x: i32,
    pub cursor_y: i32,
}

use std::sync::atomic::{AtomicBool, Ordering};

static MAIN_GHOST: AtomicBool = AtomicBool::new(false);
static PIP_GHOST: AtomicBool = AtomicBool::new(false);

fn apply_ghost_mode(app_handle: &AppHandle, window_label: &str, enable: bool) -> Result<(), String> {
    if let Some(window) = app_handle.get_webview_window(window_label) {
        if enable {
            let _ = window.set_always_on_top(true);
        } else if window_label == "main" {
            let _ = window.set_always_on_top(false);
        }
        window.set_ignore_cursor_events(enable)
            .map_err(|e| format!("Failed to set ignore_cursor_events on {window_label}: {e}"))?;

        if window_label == "main" {
            MAIN_GHOST.store(enable, Ordering::SeqCst);
            let _ = app_handle.emit("main-ghost-sync", enable);
        } else if window_label == "pip-hud" {
            PIP_GHOST.store(enable, Ordering::SeqCst);
            let _ = app_handle.emit("pip-ghost-sync", enable);
            let _ = app_handle.emit("pip-sync", serde_json::json!({ "isGhost": enable }));
        }

        Ok(())
    } else {
        Err(format!("Window '{window_label}' not found"))
    }
}

#[tauri::command]
fn start_dragging(window: tauri::WebviewWindow) -> Result<(), String> {
    #[cfg(windows)]
    {
        use windows::Win32::Foundation::{HWND, LPARAM, WPARAM};
        use windows::Win32::UI::Input::KeyboardAndMouse::ReleaseCapture;
        use windows::Win32::UI::WindowsAndMessaging::{SendMessageW, WM_SYSCOMMAND};
        if let Ok(hwnd) = window.hwnd() {
            unsafe {
                let _ = ReleaseCapture();
                let _ = SendMessageW(
                    HWND(hwnd.0 as _),
                    WM_SYSCOMMAND,
                    Some(WPARAM(0xF012)),
                    Some(LPARAM(0)),
                );
                return Ok(());
            }
        }
    }
    let _ = window.start_dragging();
    Ok(())
}

#[tauri::command]
fn minimize_window(window: tauri::WebviewWindow) -> Result<(), String> {
    window.minimize().map_err(|e| e.to_string())
}

#[tauri::command]
fn set_ghost_mode(app_handle: AppHandle, window_label: String, enable: bool) -> Result<(), String> {
    apply_ghost_mode(&app_handle, &window_label, enable)
}

#[tauri::command]
fn disable_all_ghost(app_handle: AppHandle) -> Result<(), String> {
    let _ = apply_ghost_mode(&app_handle, "main", false);
    let _ = apply_ghost_mode(&app_handle, "pip-hud", false);
    Ok(())
}

#[tauri::command]
async fn fetch_html_cors_bypass(url: String) -> Result<String, String> {
    network::fetch_html_cors_bypass(&url).await
}

#[tauri::command]
fn capture_cursor_area(width: u32, height: u32) -> Result<Vec<u8>, String> {
    capture::win_capture::capture_cursor_area(width, height)
}

#[tauri::command]
fn capture_screen_full() -> Result<Vec<u8>, String> {
    capture::win_capture::capture_screen_full()
}

#[tauri::command]
fn run_windows_ocr(image_bytes: Vec<u8>) -> Result<String, String> {
    ocr::run_windows_ocr(&image_bytes)
}

#[tauri::command]
async fn translate_text(text: String, source_lang: Option<String>, target_lang: Option<String>) -> Result<String, String> {
    let sl = source_lang.unwrap_or_else(|| "auto".to_string());
    let tl = target_lang.unwrap_or_else(|| "ru".to_string());
    network::translate_text(&text, &sl, &tl).await
}

#[tauri::command]
async fn hover_translate_at_cursor() -> Result<HoverTranslateResponse, String> {
    let (cx, cy) = capture::win_capture::get_cursor_pos()?;
    let img_bytes = capture::win_capture::capture_cursor_area(500, 350)?;
    let ocr_text = ocr::run_windows_ocr(&img_bytes)?;

    let clean_ocr = ocr_text.trim().to_string();
    if clean_ocr.is_empty() {
        return Ok(HoverTranslateResponse {
            original_text: String::new(),
            translated_text: "Текст не обнаружен".to_string(),
            cursor_x: cx,
            cursor_y: cy,
        });
    }

    let translated = network::translate_text(&clean_ocr, "auto", "ru").await
        .unwrap_or_else(|e| format!("Ошибка перевода: {e}"));

    Ok(HoverTranslateResponse {
        original_text: clean_ocr,
        translated_text: translated,
        cursor_x: cx,
        cursor_y: cy,
    })
}

#[tauri::command]
fn save_note_file(path: String, content: String) -> Result<(), String> {
    storage::save_note(&path, &content)
}

#[tauri::command]
fn read_note_file(path: String) -> Result<String, String> {
    storage::read_note(&path)
}

#[tauri::command]
fn read_notes_directory() -> Result<Vec<NoteFileInfo>, String> {
    storage::read_notes_dir()
}

#[tauri::command]
fn delete_note_file(path: String) -> Result<(), String> {
    storage::delete_note(&path)
}

#[tauri::command]
fn load_config() -> Result<String, String> {
    storage::load_config_json()
}

#[tauri::command]
fn save_config(config_json: String) -> Result<(), String> {
    storage::save_config_json(&config_json)
}

#[tauri::command]
fn list_profiles() -> Result<Vec<String>, String> {
    storage::list_profile_names()
}

#[tauri::command]
fn load_profile(name: String) -> Result<String, String> {
    storage::load_profile_json(&name)
}

#[tauri::command]
fn save_profile(name: String, profile_json: String) -> Result<(), String> {
    storage::save_profile_json(&name, &profile_json)
}

#[tauri::command]
fn delete_profile(name: String) -> Result<(), String> {
    storage::delete_profile_json(&name)
}

#[tauri::command]
fn show_window(app_handle: AppHandle, window_label: String) -> Result<(), String> {
    if let Some(window) = app_handle.get_webview_window(&window_label) {
        window.show().map_err(|e| e.to_string())?;
        let _ = window.set_focus();
        Ok(())
    } else {
        Err(format!("Window '{window_label}' not found"))
    }
}

#[tauri::command]
fn hide_window(app_handle: AppHandle, window_label: String) -> Result<(), String> {
    if let Some(window) = app_handle.get_webview_window(&window_label) {
        window.hide().map_err(|e| e.to_string())?;
        Ok(())
    } else {
        Err(format!("Window '{window_label}' not found"))
    }
}

#[tauri::command]
fn toggle_window(app_handle: AppHandle, window_label: String) -> Result<bool, String> {
    if let Some(window) = app_handle.get_webview_window(&window_label) {
        let is_vis = window.is_visible().unwrap_or(false);
        if is_vis {
            window.hide().map_err(|e| e.to_string())?;
            Ok(false)
        } else {
            window.show().map_err(|e| e.to_string())?;
            let _ = window.set_focus();
            Ok(true)
        }
    } else {
        Err(format!("Window '{window_label}' not found"))
    }
}

#[tauri::command]
fn is_window_visible(app_handle: AppHandle, window_label: String) -> Result<bool, String> {
    if let Some(window) = app_handle.get_webview_window(&window_label) {
        Ok(window.is_visible().unwrap_or(false))
    } else {
        Ok(false)
    }
}

#[tauri::command]
fn get_cursor_position() -> Result<(i32, i32), String> {
    capture::win_capture::get_cursor_pos()
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let _ = storage::ensure_directories();

    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(
            tauri_plugin_global_shortcut::Builder::new()
                .with_handler(|app, shortcut, event| {
                    if event.state() == ShortcutState::Pressed {
                        let sc = shortcut.to_string().to_lowercase();
                        if sc.contains("alt") && (sc.contains("keyg") || sc.ends_with("+g")) {
                            let current = MAIN_GHOST.load(Ordering::SeqCst);
                            let _ = apply_ghost_mode(app, "main", !current);
                        } else if sc.contains("alt") && (sc.contains("keyl") || sc.ends_with("+l")) {
                            let current = PIP_GHOST.load(Ordering::SeqCst);
                            let _ = apply_ghost_mode(app, "pip-hud", !current);
                        } else if sc.contains("alt") && (sc.contains("keyh") || sc.ends_with("+h")) {
                            if let Some(win) = app.get_webview_window("pip-hud") {
                                let is_vis = win.is_visible().unwrap_or(false);
                                if is_vis {
                                    let _ = win.hide();
                                } else {
                                    let _ = win.show();
                                }
                            }
                        } else if sc.contains("alt") && (sc.contains("keyp") || sc.ends_with("+p")) {
                            let _ = app.emit("toggle-pip-playback", ());
                        }
                    }
                })
                .build(),
        )
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            if let Ok(alt_g) = "alt+g".parse::<Shortcut>() {
                let _ = app.global_shortcut().register(alt_g);
            }
            if let Ok(alt_l) = "alt+l".parse::<Shortcut>() {
                let _ = app.global_shortcut().register(alt_l);
            }
            if let Ok(alt_h) = "alt+h".parse::<Shortcut>() {
                let _ = app.global_shortcut().register(alt_h);
            }
            if let Ok(alt_p) = "alt+p".parse::<Shortcut>() {
                let _ = app.global_shortcut().register(alt_p);
            }

            // Setup System Tray
            let open_i = MenuItem::with_id(app, "open_hub", "Открыть GameHUD (Настройки)", true, None::<&str>)?;
            let timer_i = MenuItem::with_id(app, "toggle_timer", "⏱️ Таймеры HUD", true, None::<&str>)?;
            let pip_i = MenuItem::with_id(app, "toggle_pip", "📺 PiP Видеоплеер", true, None::<&str>)?;
            let snipper_i = MenuItem::with_id(app, "open_snipper", "✂️ Стоп-кадр OCR", true, None::<&str>)?;
            let ghost_off_i = MenuItem::with_id(app, "disable_ghost", "🔓 Выключить Ghost Mode (Все окна)", true, None::<&str>)?;
            let quit_i = MenuItem::with_id(app, "quit", "Выход", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&open_i, &timer_i, &pip_i, &snipper_i, &ghost_off_i, &quit_i])?;

            if let Some(icon) = app.default_window_icon() {
                let _tray = TrayIconBuilder::new()
                    .icon(icon.clone())
                    .menu(&menu)
                    .show_menu_on_left_click(false)
                    .on_menu_event(|app, event| {
                        match event.id.as_ref() {
                            "open_hub" => {
                                if let Some(win) = app.get_webview_window("main") {
                                    let _ = win.show();
                                    let _ = win.set_focus();
                                    let _ = win.emit("open-settings", ());
                                }
                            }
                            "toggle_timer" => {
                                if let Some(win) = app.get_webview_window("timer-hud") {
                                    if win.is_visible().unwrap_or(false) {
                                        let _ = win.hide();
                                    } else {
                                        let _ = win.show();
                                        let _ = win.set_focus();
                                    }
                                }
                            }
                            "toggle_pip" => {
                                if let Some(win) = app.get_webview_window("pip-hud") {
                                    if win.is_visible().unwrap_or(false) {
                                        let _ = win.hide();
                                    } else {
                                        let _ = win.show();
                                        let _ = win.set_focus();
                                    }
                                }
                            }
                            "open_snipper" => {
                                if let Some(win) = app.get_webview_window("snipper") {
                                    let _ = win.show();
                                    let _ = win.set_focus();
                                }
                            }
                            "disable_ghost" => {
                                let _ = apply_ghost_mode(app, "main", false);
                                let _ = apply_ghost_mode(app, "pip-hud", false);
                            }
                            "quit" => {
                                app.exit(0);
                            }
                            _ => {}
                        }
                    })
                    .on_tray_icon_event(|tray, event| {
                        if let TrayIconEvent::Click { button: tauri::tray::MouseButton::Left, .. } = event {
                            let app = tray.app_handle();
                            if let Some(win) = app.get_webview_window("main") {
                                let _ = win.show();
                                let _ = win.set_focus();
                                let _ = win.emit("open-settings", ());
                            }
                        }
                    })
                    .build(app)?;
            }

            Ok(())
        })
        .on_window_event(|window, event| {
            if let WindowEvent::CloseRequested { api, .. } = event {
                // When closing the main HUB window, hide it to tray instead of exiting
                if window.label() == "main" {
                    api.prevent_close();
                    let _ = window.hide();
                }
            }
        })
        .invoke_handler(tauri::generate_handler![
            start_dragging,
            minimize_window,
            set_ghost_mode,
            disable_all_ghost,
            fetch_html_cors_bypass,
            capture_cursor_area,
            capture_screen_full,
            run_windows_ocr,
            translate_text,
            hover_translate_at_cursor,
            save_note_file,
            read_note_file,
            read_notes_directory,
            delete_note_file,
            load_config,
            save_config,
            list_profiles,
            load_profile,
            save_profile,
            delete_profile,
            show_window,
            hide_window,
            toggle_window,
            is_window_visible,
            get_cursor_position
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
