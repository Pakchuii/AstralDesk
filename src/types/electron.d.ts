export interface ElectronAPI {
  minimize: () => void;
  maximize: () => void;
  close: () => void;
  minimizeWindow?: () => void;
  moveWindowBy?: (deltaX: number, deltaY: number) => void;
  resizeWindowBy?: (deltaW: number, deltaH: number) => void;
  setWindowSize?: (width: number, height: number) => void;
  setIgnoreMouseEvents?: (ignore: boolean, options?: { forward?: boolean }) => void;
  setWindowMode: (mode: 'main' | 'mini') => void;
  onModeChange?: (callback: (mode: 'main' | 'mini') => void) => void;
  openExternal: (url: string) => void;
  getAutoLaunch?: () => Promise<boolean>;
  setAutoLaunch?: (enabled: boolean) => Promise<boolean>;
  getSystemFonts?: () => Promise<string[]>;
  getMouseThrough?: () => Promise<boolean>;
  setMouseThrough?: (enabled: boolean) => Promise<boolean>;
  onMouseThroughChange?: (callback: (enabled: boolean) => void) => void;
  onAstrBotPushMessage?: (callback: (data: any) => void) => void;
  fetchMissedMessages?: (limit?: number) => Promise<any[]>;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
    queryLocalFonts?: () => Promise<any[]>;
  }
}
