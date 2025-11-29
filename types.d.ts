// Type definitions for GNOME Shell Extension
// This file helps TypeScript/JSDoc understand GJS imports

declare module 'gi://*' {
    const content: any;
    export default content;
}

declare module 'resource:///org/gnome/shell/extensions/extension.js' {
    export class Extension {
        getSettings(): any;
        metadata: any;
    }
}

declare module 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js' {
    export class ExtensionPreferences {
        getSettings(): any;
        fillPreferencesWindow(window: any): void;
    }
}

declare module 'resource:///org/gnome/shell/ui/main.js' {
    export const layoutManager: any;
    export const wm: any;
}

declare const global: {
    display: any;
    workspace_manager: any;
    screen_width: number;
    screen_height: number;
    stage: any;
    get_current_time(): number;
};

declare const log: (message: string) => void;
declare const logError: (message: string, error?: Error) => void;

declare const imports: any;
