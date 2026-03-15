use tauri::{Emitter, Manager};
use tauri::menu::{CheckMenuItem, Menu, MenuItem, PredefinedMenuItem, Submenu};

#[tauri::command]
async fn run_update() -> Result<String, String> {
  tauri::async_runtime::spawn_blocking(|| {
    let output = std::process::Command::new("/bin/zsh")
      .args(["--login", "-c", "curl -fsSL https://raw.githubusercontent.com/ollegreen/pad/main/setup.sh | zsh"])
      .output()
      .map_err(|e| e.to_string())?;
    if output.status.success() {
      Ok("done".to_string())
    } else {
      Err(String::from_utf8_lossy(&output.stderr).to_string())
    }
  })
  .await
  .map_err(|e| e.to_string())?
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_dialog::init())
    .plugin(tauri_plugin_fs::init())
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }

      let app_menu = Submenu::with_items(app, "Pad", true, &[
        &PredefinedMenuItem::about(app, Some("About Pad"), None)?,
        &PredefinedMenuItem::separator(app)?,
        &PredefinedMenuItem::services(app, None)?,
        &PredefinedMenuItem::separator(app)?,
        &PredefinedMenuItem::hide(app, None)?,
        &PredefinedMenuItem::hide_others(app, None)?,
        &PredefinedMenuItem::show_all(app, None)?,
        &PredefinedMenuItem::separator(app)?,
        &PredefinedMenuItem::quit(app, None)?,
      ])?;

      let file_menu = Submenu::with_items(app, "File", true, &[
        &MenuItem::with_id(app, "new_pad_set", "New Pad Set", true, Some("CmdOrCtrl+Alt+N"))?,
        &MenuItem::with_id(app, "open_pad_set", "Open Pad Set", true, Some("CmdOrCtrl+Shift+O"))?,
        &MenuItem::with_id(app, "add_onboarding", "Add Onboarding Pads", true, None::<&str>)?,
        &PredefinedMenuItem::separator(app)?,
        &MenuItem::with_id(app, "check_updates", "Check for Updates…", true, None::<&str>)?,
        &PredefinedMenuItem::separator(app)?,
        &CheckMenuItem::with_id(app, "pain_mode", "Pain Mode", true, false, None::<&str>)?,
      ])?;

      let edit_menu = Submenu::with_items(app, "Edit", true, &[
        &PredefinedMenuItem::undo(app, None)?,
        &PredefinedMenuItem::redo(app, None)?,
        &PredefinedMenuItem::separator(app)?,
        &PredefinedMenuItem::cut(app, None)?,
        &PredefinedMenuItem::copy(app, None)?,
        &PredefinedMenuItem::paste(app, None)?,
        &PredefinedMenuItem::select_all(app, None)?,
      ])?;

      let menu = Menu::with_items(app, &[&app_menu, &file_menu, &edit_menu])?;
      app.set_menu(menu)?;

      Ok(())
    })
    .on_menu_event(|app, event| {
      match event.id().as_ref() {
        "new_pad_set" => { let _ = app.emit("menu-new-pad-set", ()); },
        "open_pad_set" => { let _ = app.emit("menu-open-pad-set", ()); },
        "add_onboarding" => { let _ = app.emit("menu-add-onboarding", ()); },
        "pain_mode" => { let _ = app.emit("menu-pain-mode", ()); },
        "check_updates" => { let _ = app.emit("menu-check-updates", ()); },
        _ => {}
      }
    })
    .invoke_handler(tauri::generate_handler![run_update])
    .build(tauri::generate_context!())
    .expect("error while building tauri application")
    .run(|app, event| {
      if let tauri::RunEvent::Reopen { .. } = event {
        if let Some(win) = app.get_webview_window("main") {
          let _ = win.show();
          let _ = win.set_focus();
        }
      }
    });
}
