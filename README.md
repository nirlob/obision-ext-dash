# Obision Ext Dash

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
gnome-extensions enable obision-ext-dash@obision.com
```

Or reload GNOME Shell (Alt+F2, type 'r', Enter on X11).

## Development

```bash
npm run update  # Build, install, and reload
```

## Configuration

Access preferences through GNOME Extensions app or:
```bash
gnome-extensions prefs obision-ext-dash@obision.com
```

- **Position**: Where to place the dash (Left/Right/Top/Bottom)
- **Dash Size**: Width or height in pixels
- **Icon Size**: Size of application icons
- **Auto-hide**: Hide when not in use
- **Keybinding**: Toggle dash visibility (default: Super+D)

## Releases

Releases are automated through GitHub Actions. When a new tag is pushed:

1. The extension is built and packaged as a `.deb` file
2. A GitHub release is created with the `.deb` attached
3. The `.deb` is copied to the [obision-packages](https://github.com/nirlob/obision-packages) repository
4. The `releases.json` file is updated with the new version
5. APT repository metadata (`Packages` and `Packages.gz`) is regenerated

### Creating a New Release

```bash
npm run release
```

This script will:
- Bump the version in `package.json` and `metadata.json`
- Update `debian/changelog`
- Commit the changes
- Create and push a git tag
- Trigger the GitHub Action to build and publish

See [.github/PACKAGES_TOKEN_SETUP.md](.github/PACKAGES_TOKEN_SETUP.md) for setting up the required access token.
