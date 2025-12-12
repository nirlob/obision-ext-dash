# Obision Extension Dash - AI Coding Agent Instructions

## Project Overview

This is a **GNOME Shell 48 extension** that provides a customizable dash/taskbar panel. Unlike other dash extensions, this project **reuses GNOME Shell's native dash** (hiding the original) and creates a custom panel with app icons, system tray integration, and extensive customization options.

**Architecture**: Single-file extension (`extension.js` ~3200 lines) with separate preferences UI (`prefs.js` ~1000 lines).

## Critical Development Context

### GNOME Shell Extension Fundamentals

- **GJS Environment**: JavaScript with GObject introspection bindings (`gi://` imports) and GNOME Shell resources (`resource:///` imports)
- **Extension Lifecycle**: Extensions must properly implement `enable()` and `disable()` methods that are fully reversible
- **Key Pattern**: Always save original state before modification, restore in `disable()`:

    ```javascript
    // In enable()
    this._originalDashParent = this._dash.get_parent();
    this._originalDashIndex = this._originalDashParent.get_children().indexOf(this._dash);

    // In disable()
    this._originalDashParent.insert_child_at_index(this._dash, this._originalDashIndex);
    ```

### Architecture Decisions

1. **Native Dash Reuse**: `Main.overview.dash` is **hidden** (not moved) to preserve all native GNOME functionality. Custom app icons are built separately in `_buildAppIcons()`.

2. **UI Hierarchy**:
    - `this._panel` → Main container added to `Main.layoutManager` chrome layer
    - `this._topBarContainer` → Wraps GNOME's native `Main.panel`
    - `this._appIconsBox` → Custom-built app icons (favorites + running apps)
    - Native dash stays in overview but hidden

3. **GSettings Schema**: All settings in `schemas/com.obision.extensions.dash.gschema.xml` must be compiled before use. Settings changes trigger real-time UI updates via `_settings.connect('changed::setting-name', callback)`.

4. **Signal Management**: All signal connections must be tracked and disconnected in `disable()`. Pattern used throughout:
    ```javascript
    this._settingsChangedIds.push(
        this._settings.connect('changed::dash-position', () => this._repositionPanel())
    );
    ```

### Development Workflows

**Build & Test Cycle**:

```bash
npm run update              # Build + install + reload (fastest iteration)
npm run build               # Compile schemas + pack extension
npm run install             # Install to ~/.local/share/gnome-shell/extensions/
npm run enable              # Enable extension
npm run reload              # Disable/enable cycle (scripts/reload.sh)
```

**Important**: GNOME Shell caching is aggressive. Use `npm run update` during active development. For Wayland, full logout/login may be needed for major changes.

**Debian Packaging**:

```bash
npm run deb-build           # Build .deb package using dpkg-buildpackage
npm run deb-install         # Install system-wide via dpkg
```

**Reset Settings**: `npm run reset` clears all dconf settings for the extension.

### Code Patterns & Conventions

**Actor Creation Pattern**:

```javascript
this._panel = new St.BoxLayout({
    name: 'obision-panel',
    style_class: 'obision-panel', // CSS in stylesheet.css
    reactive: true, // Receives events
    track_hover: true,
    clip_to_allocation: true,
});
```

**Settings Access**:

```javascript
const position = this._settings.get_string('dash-position');
this._settings.set_boolean('auto-hide', true);
```

**UI Updates**: All UI modification methods (like `_updatePanelBackground()`, `_buildAppIcons()`) are idempotent and can be called repeatedly as settings change.

**Chrome Layer**: Panel uses `Main.layoutManager.addChrome()` to integrate with GNOME's window management. Set `affectsStruts: true` to reserve screen space.

### Key Files & Their Roles

- **`extension.js`**: Single class `ObisionExtensionDash extends Extension`. Contains all panel logic, app icon management, auto-hide behavior, and UI construction.
- **`prefs.js`**: Uses Adwaita (`Adw`) widgets to build multi-page preferences window. Extends `ExtensionPreferences`.
- **`metadata.json`**: Extension UUID, supported shell versions (currently `["48"]`), and integer version number.
- **`schemas/*.gschema.xml`**: GSettings schema. Changes require `glib-compile-schemas` before use.
- **`stylesheet.css`**: Custom CSS using GNOME Shell's St (shell toolkit) classes.
- **`types.d.ts`**: Type hints for GJS imports (helps IDEs, not used at runtime).

### Common Gotchas

1. **Startup Timing**: Shell may not be fully initialized when `enable()` is called. Check for `Main.overview.dash` existence and use `Main.layoutManager.connect('startup-complete', ...)` if needed.

2. **Cleanup Order**: In `disable()`, disconnect signals before destroying actors to avoid accessing destroyed objects.

3. **Schema Compilation**: After editing `.gschema.xml`, run `npm run compile-schemas` or settings won't load.

4. **Position Changes**: When dash position changes (LEFT/RIGHT/TOP/BOTTOM), panel must be destroyed and rebuilt (`_repositionPanel()` does full teardown/recreation).

5. **TypeScript Config**: `tsconfig.json` is for IDE support only—code runs as pure JavaScript in GJS.

### Testing & Debugging

- **Logs**: Use `log('message')` and `logError('message', error)`. View with: `journalctl -f -o cat /usr/bin/gnome-shell`
- **Looking Glass**: Alt+F2, type `lg` for GNOME Shell inspector
- **Preferences**: Test with `gnome-extensions prefs obision-extension-dash@obision.com`

### Integration Points

- **AppFavorites**: `AppFavorites.getAppFavorites()` for favorites list, must watch `changed` signal
- **Shell.AppSystem**: Track running apps via `app-state-changed` signal
- **SystemActions**: For power menu integration
- **Main.panel**: Native top panel is wrapped and integrated into custom panel

### Style Guide

- Use arrow functions for callbacks
- Name private properties with leading underscore: `this._panel`
- No semicolons (ESLint + Prettier configured)
- Prefer const/let over var
- Use template literals for multi-line CSS

## Quick Reference

**Restart Extension**: `npm run update`  
**View Logs**: `journalctl -f -o cat /usr/bin/gnome-shell`  
**Reset Settings**: `npm run reset`  
**Pack for Release**: `npm run build` (creates zip in `builddir/`)
