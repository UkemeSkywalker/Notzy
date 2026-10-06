use tauri::{
    menu::{MenuBuilder, MenuItemBuilder},
    tray::TrayIconBuilder,
    AppHandle, Emitter, Manager,
};

fn show_main(app: &AppHandle) {
    if let Some(main) = app.get_webview_window("main") {
        let _ = main.show();
        let _ = main.set_focus();
    }
}

/// The main webview (hidden or not) owns the store, so it creates the note
/// and spawns the sticky window.
fn request_new_sticky(app: &AppHandle) {
    let _ = app.emit_to("main", "notzy://new-sticky", ());
}

/// Hide every sticky window if any is visible, otherwise show them all.
fn toggle_stickies(app: &AppHandle) {
    let stickies: Vec<_> = app
        .webview_windows()
        .into_iter()
        .filter(|(label, _)| label.starts_with("sticky-"))
        .map(|(_, w)| w)
        .collect();
    let any_visible = stickies.iter().any(|w| w.is_visible().unwrap_or(false));
    for w in stickies {
        let _ = if any_visible { w.hide() } else { w.show() };
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let app = tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .setup(|app| {
            let new_sticky = MenuItemBuilder::with_id("new-sticky", "New Sticky Note").build(app)?;
            let toggle = MenuItemBuilder::with_id("toggle-stickies", "Show/Hide Stickies").build(app)?;
            let open = MenuItemBuilder::with_id("open-notzy", "Open Notzy").build(app)?;
            let quit = MenuItemBuilder::with_id("quit", "Quit Notzy").build(app)?;
            let menu = MenuBuilder::new(app)
                .item(&new_sticky)
                .item(&toggle)
                .separator()
                .item(&open)
                .separator()
                .item(&quit)
                .build()?;
            let mut tray = TrayIconBuilder::with_id("notzy-tray")
                .tooltip("Notzy")
                .menu(&menu)
                .show_menu_on_left_click(true)
                .on_menu_event(|app, event| match event.id().as_ref() {
                    "new-sticky" => request_new_sticky(app),
                    "toggle-stickies" => toggle_stickies(app),
                    "open-notzy" => show_main(app),
                    "quit" => app.exit(0),
                    _ => {}
                });
            if let Some(icon) = app.default_window_icon() {
                tray = tray.icon(icon.clone());
            }
            tray.build(app)?;
            Ok(())
        })
        .on_window_event(|window, event| {
            // Closing the main window hides it so sticky notes stay alive;
            // the app keeps running (dock click or tray brings it back).
            if window.label() == "main" {
                if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                    api.prevent_close();
                    let _ = window.hide();
                }
            }
        })
        .build(tauri::generate_context!())
        .expect("error while building tauri application");

    app.run(|app_handle, event| {
        #[cfg(target_os = "macos")]
        if let tauri::RunEvent::Reopen { .. } = event {
            show_main(app_handle);
        }
        #[cfg(not(target_os = "macos"))]
        let _ = (app_handle, event);
    });
}
