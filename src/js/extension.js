import { Extension } from 'resource:///org/gnome/shell/extensions/extension.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import St from 'gi://St';
import Shell from 'gi://Shell';
import Meta from 'gi://Meta';
import Clutter from 'gi://Clutter';
import GObject from 'gi://GObject';

export default class ObisionExtensionDash extends Extension {
    constructor(metadata) {
        super(metadata);
        this._settings = null;
        this._originalDashParent = null;
        this._originalDashIndex = null;
        this._dash = null;
        this._panel = null;
        this._dashContainer = null;
        this._topBarContainer = null;
    }

    enable() {
        log('Obision Extension Dash enabling');
        
        this._settings = this.getSettings();
        
        // Get the native dash from overview
        this._dash = Main.overview.dash;
        
        // Save original parent and position
        this._originalDashParent = this._dash.get_parent();
        if (this._originalDashParent) {
            this._originalDashIndex = this._originalDashParent.get_children().indexOf(this._dash);
        }
        
        // Create main panel container
        this._panel = new St.BoxLayout({
            name: 'obision-panel',
            style_class: 'obision-panel',
            reactive: true,
            track_hover: true,
            clip_to_allocation: true,
        });
        
        // Create dash container (will hold the dash icons)
        this._dashContainer = new St.BoxLayout({
            name: 'obision-dash-container',
            style_class: 'obision-dash-container',
            x_expand: true,
            y_expand: true,
            clip_to_allocation: true,
        });
        
        // Create top-bar container (for future elements)
        this._topBarContainer = new St.BoxLayout({
            name: 'obision-topbar-container',
            style_class: 'obision-topbar-container',
        });
        
        // Remove dash from overview
        if (this._originalDashParent) {
            this._originalDashParent.remove_child(this._dash);
        }
        
        // Add dash to dash container
        this._dashContainer.add_child(this._dash);
        
        // Add containers to main panel
        this._panel.add_child(this._dashContainer);
        this._panel.add_child(this._topBarContainer);
        
        // Add panel to stage as chrome (always visible)
        Main.layoutManager.addChrome(this._panel, {
            affectsStruts: true,
            trackFullscreen: true,
        });
        
        // Position the panel
        this._updatePanelPosition();
        this._updatePanelPadding();
        
        // Make dash always visible
        this._dash.visible = true;
        this._dash.opacity = 255;
        
        // Connect to monitor changes
        this._monitorsChangedId = Main.layoutManager.connect('monitors-changed', () => {
            this._updatePanelPosition();
        });
        
        // Connect to settings changes
        this._settingsChangedIds = [
            this._settings.connect('changed::dash-position', () => this._updatePanelPosition()),
            this._settings.connect('changed::dash-size', () => this._updatePanelPosition()),
            this._settings.connect('changed::icon-size', () => this._updatePanelPosition()),
            this._settings.connect('changed::panel-padding', () => this._updatePanelPadding()),
        ];
        
        // Add keybinding to toggle
        Main.wm.addKeybinding(
            'toggle-dash',
            this._settings,
            Meta.KeyBindingFlags.NONE,
            Shell.ActionMode.NORMAL,
            () => this._togglePanel()
        );
        
        log('Obision Extension Dash enabled');
    }

    disable() {
        log('Obision Extension Dash disabling');
        
        // Remove keybinding
        Main.wm.removeKeybinding('toggle-dash');
        
        // Disconnect signals
        if (this._monitorsChangedId) {
            Main.layoutManager.disconnect(this._monitorsChangedId);
            this._monitorsChangedId = null;
        }
        
        if (this._settingsChangedIds) {
            this._settingsChangedIds.forEach(id => this._settings.disconnect(id));
            this._settingsChangedIds = null;
        }
        
        // Restore dash to overview
        if (this._dash && this._dashContainer) {
            this._dashContainer.remove_child(this._dash);
        }
        
        // Clean up containers
        if (this._topBarContainer) {
            this._topBarContainer.destroy();
            this._topBarContainer = null;
        }
        
        if (this._dashContainer) {
            this._dashContainer.destroy();
            this._dashContainer = null;
        }
        
        if (this._panel) {
            Main.layoutManager.removeChrome(this._panel);
            this._panel.destroy();
            this._panel = null;
        }
        
        // Put dash back in overview
        if (this._dash && this._originalDashParent) {
            if (this._originalDashIndex >= 0) {
                this._originalDashParent.insert_child_at_index(this._dash, this._originalDashIndex);
            } else {
                this._originalDashParent.add_child(this._dash);
            }
        }
        
        this._dash = null;
        this._originalDashParent = null;
        this._originalDashIndex = null;
        this._settings = null;
        
        log('Obision Extension Dash disabled');
    }

    _updatePanelPosition() {
        if (!this._panel) return;
        
        const monitor = Main.layoutManager.primaryMonitor;
        const position = this._settings.get_string('dash-position');
        const dashSize = this._settings.get_int('dash-size');
        
        // Get panel height if exists
        const panelHeight = this._getPanelHeight();
        
        switch (position) {
            case 'TOP':
                this._panel.set_position(
                    monitor.x,
                    monitor.y + panelHeight.top
                );
                this._panel.set_size(monitor.width, dashSize);
                this._panel.vertical = false;
                this._dashContainer.vertical = false;
                this._topBarContainer.vertical = false;
                if (this._dash._box) this._dash._box.vertical = false;
                this._updateDashSize(monitor.width, dashSize);
                break;
                
            case 'BOTTOM':
                this._panel.set_position(
                    monitor.x,
                    monitor.y + monitor.height - dashSize - panelHeight.bottom
                );
                this._panel.set_size(monitor.width, dashSize);
                this._panel.vertical = false;
                this._dashContainer.vertical = false;
                this._topBarContainer.vertical = false;
                if (this._dash._box) this._dash._box.vertical = false;
                this._updateDashSize(monitor.width, dashSize);
                break;
                
            case 'LEFT':
                this._panel.set_position(
                    monitor.x,
                    monitor.y + panelHeight.top
                );
                this._panel.set_size(dashSize, monitor.height - panelHeight.top - panelHeight.bottom);
                this._panel.vertical = true;
                this._dashContainer.vertical = true;
                this._topBarContainer.vertical = true;
                if (this._dash._box) this._dash._box.vertical = true;
                this._updateDashSize(dashSize, monitor.height - panelHeight.top - panelHeight.bottom);
                break;
                
            case 'RIGHT':
                this._panel.set_position(
                    monitor.x + monitor.width - dashSize,
                    monitor.y + panelHeight.top
                );
                this._panel.set_size(dashSize, monitor.height - panelHeight.top - panelHeight.bottom);
                this._panel.vertical = true;
                this._dashContainer.vertical = true;
                this._topBarContainer.vertical = true;
                if (this._dash._box) this._dash._box.vertical = true;
                this._updateDashSize(dashSize, monitor.height - panelHeight.top - panelHeight.bottom);
                break;
        }
    }

    _getPanelHeight() {
        const result = { top: 0, bottom: 0 };
        const monitor = Main.layoutManager.primaryMonitor;
        
        // Check all tracked actors for panels
        Main.layoutManager._trackedActors.forEach(obj => {
            const actor = obj.actor;
            if (!actor || !actor.visible) return;
            
            const height = actor.height;
            const y = actor.y;
            const width = actor.width;
            
            // Look for wide actors that span most of the screen (likely panels)
            const isWideEnough = width >= monitor.width * 0.8;
            const hasReasonableHeight = height > 20 && height < 200;
            
            if (isWideEnough && hasReasonableHeight) {
                if (y <= monitor.y + 50) {
                    result.top = Math.max(result.top, height);
                } else if (y >= monitor.y + monitor.height - height - 50) {
                    result.bottom = Math.max(result.bottom, height);
                }
            }
        });
        
        return result;
    }

    _updateDashSize(width, height) {
        if (!this._dash) return;
        
        const padding = this._settings.get_int('panel-padding');
        const availableSize = Math.min(width, height) - (padding * 2);
        
        this._dash.setMaxSize(width, height);
        
        // Icon size should fill the available height/width
        const iconSize = Math.min(this._settings.get_int('icon-size'), availableSize);
        this._dash.iconSize = iconSize;
    }

    _updatePanelPadding() {
        if (!this._dashContainer) return;
        
        const padding = this._settings.get_int('panel-padding');
        this._dashContainer.style = `padding: ${padding}px;`;
        
        // Update dash size when padding changes
        this._updatePanelPosition();
    }

    _togglePanel() {
        if (this._panel) {
            this._panel.visible = !this._panel.visible;
        }
    }
}
