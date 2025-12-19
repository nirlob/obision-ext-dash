# Obision Ext Dash - AI Coding Agent Instructions

## Project Overview

This is a **GNOME Shell 48 extension** that provides a customizable dash/taskbar panel. Unlike other dash extensions, this project **reuses GNOME Shell's native dash** (hiding the original) and creates a custom panel with app icons, system tray integration, and extensive customization options.

**Architecture**: Single-file extension (`extension.js` ~3400 lines) with separate preferences UI (`prefs.js` ~1000 lines).

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
    - `this._showAppsContainer` → Container for Show Apps button (outside scroll, gets full padding)
    - `this._scrollContainer` → Scrollable wrapper with prev/next buttons (padding excludes side adjacent to show apps)
    - `this._scrollView` → St.ScrollView containing icon box
    - `this._appIconsBox` → Custom-built app icons (favorites + running apps)
    - Native dash stays in overview but hidden

    **Icon Management**: `_buildAppIcons()` creates app icons in order:
    1. Show Apps button (in `_showAppsContainer`, outside scroll)
    2. Apps separator (inside scroll)
    3. Favorite apps (from `AppFavorites.getAppFavorites()`)
    4. Running separator (if non-favorite running apps exist)
    5. Non-favorite running apps (from `Shell.AppSystem.get_default().get_running()`)
    
    Icon size is auto-calculated: `containerSize - iconPadding` where `containerSize = dashSize - (2 * panel-padding)`. Never set icon size directly—adjust `dash-size` and `panel-padding` settings.

3. **GSettings Schema**: All settings in `schemas/com.obision.extensions.dash.gschema.xml` must be compiled before use. Settings changes trigger real-time UI updates via `_settings.connect('changed::setting-name', callback)`.

4. **Signal Management**: All signal connections must be tracked and disconnected in `disable()`. Settings use array-based tracking initialized in `enable()`:
    ```javascript
    // In enable()
    this._settingsChangedIds = [
        this._settings.connect('changed::dash-position', () => this._updatePanelPosition()),
        this._settings.connect('changed::dash-size', () => this._updatePanelPosition()),
        // ... more settings
    ];

    // In disable()
    if (this._settingsChangedIds) {
        this._settingsChangedIds.forEach(id => this._settings.disconnect(id));
        this._settingsChangedIds = null;
    }
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

**Debian Packaging**: Extension can be packaged as `.deb` for system-wide installation:

```bash
npm run deb-build           # Build .deb package using dpkg-buildpackage
npm run deb-install         # Install system-wide via dpkg
npm run deb-uninstall       # Remove system-wide installation
npm run deb-clean           # Clean build artifacts
```

Package is named `gnome-shell-extension-obision-dash` and installs to `/usr/share/gnome-shell/extensions/`. See `debian/control` for dependencies (requires GNOME Shell >= 45).

**Reset Settings**: `npm run reset` clears all dconf settings for the extension (`dconf reset -f /org/gnome/shell/extensions/obision-ext-dash/`).

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

- **`extension.js`**: Single class `ObisionExtDash extends Extension`. Contains all panel logic, app icon management, auto-hide behavior, and UI construction.
- **`prefs.js`**: Uses Adwaita (`Adw`) widgets to build multi-page preferences window. Extends `ExtensionPreferences`.
- **`metadata.json`**: Extension UUID, supported shell versions (currently `["48"]`), and integer version number.
- **`schemas/*.gschema.xml`**: GSettings schema. Changes require `glib-compile-schemas` before use.
- **`stylesheet.css`**: Custom CSS using GNOME Shell's St (shell toolkit) classes.
- **`types.d.ts`**: Type hints for GJS imports (helps IDEs, not used at runtime).

### Common Gotchas

1. **Startup Timing**: Shell may not be fully initialized when `enable()` is called. Extension checks for `Main.overview.dash` existence and waits for `Main.layoutManager.connect('startup-complete', ...)` if needed. See `enable()` and `_initExtension()` pattern.

2. **Cleanup Order**: In `disable()`, disconnect signals before destroying actors to avoid accessing destroyed objects. Follow the cleanup order in the existing `disable()` method.

3. **Schema Compilation**: After editing `.gschema.xml`, run `npm run compile-schemas` or settings won't load. Always include this in your build workflow.

4. **Position Changes**: When dash position changes (LEFT/RIGHT/TOP/BOTTOM), panel must be destroyed and rebuilt (`_updatePanelPosition()` does full teardown/recreation).

5. **TypeScript Config**: `tsconfig.json` is for IDE support only—code runs as pure JavaScript in GJS.

6. **Auto-hide State**: Auto-hide creates/destroys a hover zone (`this._hoverZone`) that must be properly cleaned up. Check `_enableAutoHide()` and `_disableAutoHide()` patterns.

7. **Icon Layout**: Icon size is auto-calculated based on panel size minus padding. Don't set icon size directly—adjust panel-size and panel-padding settings instead.

8. **Scroll Visibility**: Scroll buttons visibility updates are delayed (200ms, 500ms) after `_buildAppIcons()` to let layout settle. Use `_updateScrollButtonsVisibility()` which checks if content overflows the scroll view.

9. **Focus Tracking**: Extension tracks focused app via `global.display.connect('notify::focus-window')` to highlight the active icon. Focused state is updated in `_updateFocusedApp()` which adds/removes the `focused` style class.

### Testing & Debugging

- **Logs**: Use `log('message')` and `logError('message', error)`. View with: `journalctl -f -o cat /usr/bin/gnome-shell`
- **Looking Glass**: Alt+F2, type `lg` for GNOME Shell inspector
- **Preferences**: Test with `gnome-extensions prefs obision-ext-dash@obision.com`

### Integration Points

- **AppFavorites**: `AppFavorites.getAppFavorites()` for favorites list, must watch `changed` signal
- **Shell.AppSystem**: Track running apps via `app-state-changed` signal
- **SystemActions**: For power menu integration
- **Main.panel**: Native top panel is wrapped and integrated into custom panel

### Style Guide & Linting

**Code Style**:
- Use arrow functions for callbacks
- Name private properties with leading underscore: `this._panel`
- **Use semicolons** (enforced by Prettier)
- Prefer const/let over var
- Single quotes for strings (`'string'` not `"string"`)
- 4-space indentation (no tabs)
- 100 character line width
- Use template literals for multi-line CSS

**Linting & Formatting**:
```bash
npm run lint              # Check for ESLint errors
npm run lint:fix          # Auto-fix ESLint issues
npm run format            # Format with Prettier
npm run format:check      # Check formatting
```

**ESLint Config**: Allows unused vars with leading underscore (`_unused`), GJS globals (`log`, `logError`, `global`, `imports`, `ARGV`). ES2022 syntax enabled, sourceType is `module` for ES6 imports.

## Quick Reference

**Restart Extension**: `npm run update`  
**View Logs**: `journalctl -f -o cat /usr/bin/gnome-shell`  
**Reset Settings**: `npm run reset`  
**Pack for Release**: `npm run build` (creates zip in `builddir/`)
