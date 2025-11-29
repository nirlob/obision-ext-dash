# Obision Extension Dash

Custom dash panel for GNOME Shell that reuses the native dash.

## Features

- Reuses GNOME Shell's native dash (all features included)
- Posicionable: Left, Right, Top, or Bottom
- Customizable size and icon size
- Auto-hide option
- Respects existing panels (Dash to Panel, etc.)
- Keyboard shortcut to toggle (Super+D)

## Installation

```bash
npm install
npm run build
npm run install
```

Then enable the extension:
```bash
gnome-extensions enable obision-extension-dash@obision.com
```

Or reload GNOME Shell (Alt+F2, type 'r', Enter on X11).

## Development

```bash
npm run update  # Build, install, and reload
```

## Configuration

Access preferences through GNOME Extensions app or:
```bash
gnome-extensions prefs obision-extension-dash@obision.com
```

- **Position**: Where to place the dash (Left/Right/Top/Bottom)
- **Dash Size**: Width or height in pixels
- **Icon Size**: Size of application icons
- **Auto-hide**: Hide when not in use
- **Keybinding**: Toggle dash visibility (default: Super+D)
