import { app, BrowserWindow, ipcMain, globalShortcut, Tray, Menu, nativeImage, screen, protocol, net } from 'electron';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import os from 'node:os';
import { exec, execFile } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Register privileged scheme for high-performance zero-RAM local asset loading
protocol.registerSchemesAsPrivileged([
  {
    scheme: 'astral-asset',
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true,
      stream: true,
      bypassCSP: true,
    }
  }
]);

// Performance & Memory switches: Hardware rasterization with capped 512MB V8 heap to prevent GC freezes
app.commandLine.appendSwitch('enable-gpu-rasterization');
app.commandLine.appendSwitch('ignore-gpu-blocklist');
app.commandLine.appendSwitch('disable-gpu-memory-buffer-video-frames');
app.commandLine.appendSwitch('js-flags', '--max-old-space-size=512');

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let isQuitting = false;
let currentMode: 'main' | 'mini' = 'main';

const MAIN_WIDTH = 980;
const MAIN_HEIGHT = 700;
const MINI_WIDTH = 360;
const MINI_HEIGHT = 580;

// Single Instance Lock: ensure only one instance runs and second launches wake up the existing window!
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      if (!mainWindow.isVisible()) mainWindow.show();
      mainWindow.focus();
    }
  });
}

function getIcon() {
  const possiblePaths = [
    path.join(__dirname, 'icon.png'),
    path.join(__dirname, 'icon.ico'),
    path.join(__dirname, '../icon.png'),
    path.join(__dirname, '../icon.ico'),
    path.join(process.resourcesPath || '', 'icon.png'),
    path.join(process.resourcesPath || '', 'icon.ico'),
    path.join(__dirname, '../src/assets/icon.png'),
    path.join(__dirname, '../src/assets/icon.ico'),
    path.join(__dirname, '../dist/icon.png'),
  ];
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      const img = nativeImage.createFromPath(p);
      if (!img.isEmpty()) return img;
    }
  }
  return nativeImage.createEmpty();
}

function toggleWindow() {
  if (!mainWindow) {
    createWindow();
    return;
  }
  if (mainWindow.isVisible()) {
    if (mainWindow.isFocused()) {
      mainWindow.hide();
    } else {
      mainWindow.show();
      mainWindow.focus();
    }
  } else {
    mainWindow.show();
    mainWindow.focus();
  }
}

function createWindow() {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize;

  let preloadPath = path.join(__dirname, 'preload.cjs');
  if (!fs.existsSync(preloadPath)) {
    preloadPath = path.join(__dirname, 'preload.js');
  }

  const appIcon = getIcon();

  mainWindow = new BrowserWindow({
    width: MAIN_WIDTH,
    height: MAIN_HEIGHT,
    x: Math.round((screenWidth - MAIN_WIDTH) / 2),
    y: Math.round((screenHeight - MAIN_HEIGHT) / 2),
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    hasShadow: false,
    resizable: true,
    show: true,
    minWidth: 400,
    minHeight: 300,
    icon: appIcon,
    webPreferences: {
      preload: preloadPath,
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
      backgroundThrottling: false,
    },
  });

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show();
    mainWindow?.focus();
  });

  // Intercept window close: hide to tray instead of quitting
  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow?.hide();
    }
  });

  const devUrl = process.env.VITE_DEV_SERVER_URL;
  if (devUrl) {
    mainWindow.loadURL(devUrl);
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  // Window actions
  ipcMain.on('window-minimize', () => {
    mainWindow?.minimize();
  });

  ipcMain.on('window-maximize', () => {
    if (mainWindow?.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow?.maximize();
    }
  });

  ipcMain.on('window-close', () => {
    // Seamless hide to system tray
    mainWindow?.hide();
  });

  ipcMain.on('window-move-by', (_event, { deltaX, deltaY }: { deltaX: number; deltaY: number }) => {
    if (!mainWindow) return;
    const [x, y] = mainWindow.getPosition();
    mainWindow.setPosition(Math.round(x + deltaX), Math.round(y + deltaY));
  });

  ipcMain.on('window-resize-by', (_event, { deltaW, deltaH }: { deltaW: number; deltaH: number }) => {
    if (!mainWindow) return;
    const [w, h] = mainWindow.getSize();
    const nextW = Math.max(200, Math.min(1600, w + deltaW));
    const nextH = Math.max(250, Math.min(2000, h + deltaH));
    mainWindow.setSize(Math.round(nextW), Math.round(nextH));
  });

  ipcMain.on('window-set-size', (_event, { width, height }: { width: number; height: number }) => {
    if (!mainWindow) return;
    mainWindow.setSize(Math.round(width), Math.round(height));
  });

  ipcMain.on('set-ignore-mouse-events', (_event, ignore: boolean, options?: { forward?: boolean }) => {
    if (!mainWindow) return;
    mainWindow.setIgnoreMouseEvents(ignore, options ?? { forward: true });
  });

  // Mouse Pass-Through (Click-Through) for Gaming & Immersive Overlay
  ipcMain.handle('get-mouse-through', () => isMouseThrough);
  ipcMain.handle('set-mouse-through', (_event, enabled: boolean) => {
    setMouseThrough(enabled);
    return isMouseThrough;
  });

  // Auto launch settings
  ipcMain.handle('get-auto-launch', () => {
    const settings = app.getLoginItemSettings();
    return settings.openAtLogin;
  });

  ipcMain.handle('set-auto-launch', (_event, enabled: boolean) => {
    app.setLoginItemSettings({
      openAtLogin: enabled,
      openAsHidden: false,
      path: process.execPath,
      args: ['--autostart'],
    });
    return enabled;
  });

  // Get local system fonts installed on the computer
  ipcMain.handle('get-system-fonts', async () => {
    try {
      const { exec } = await import('node:child_process');
      const util = await import('node:util');
      const execPromise = util.promisify(exec);
      const { stdout } = await execPromise(
        'powershell -NoProfile -Command "Add-Type -AssemblyName System.Drawing; [System.Drawing.FontFamily]::Families | Select-Object -ExpandProperty Name"',
        { windowsHide: true, timeout: 8000 }
      );
      const fonts = stdout
        .split(/\r?\n/)
        .map((s: string) => s.trim())
        .filter((s: string) => s.length > 0);
      if (fonts.length > 0) {
        return Array.from(new Set(fonts)).sort((a: string, b: string) => a.localeCompare(b, 'zh-CN'));
      }
    } catch (e) {
      console.error('Failed to query system fonts', e);
    }
    return [
      'Microsoft YaHei', '微软雅黑', 'SimSun', '宋体', 'SimHei', '黑体', 'KaiTi', '楷体',
      'Arial', 'Calibri', 'Segoe UI', 'Consolas', 'Courier New', 'Times New Roman'
    ];
  });

  // Switch between Main Workspace and Mini Cyber Stand
  ipcMain.on('set-window-mode', (_event, mode: 'main' | 'mini') => {
    if (!mainWindow) return;
    currentMode = mode;

    if (mode === 'mini') {
      const { width: sw, height: sh } = screen.getPrimaryDisplay().workAreaSize;
      mainWindow.setAlwaysOnTop(true, 'screen-saver');
      mainWindow.setResizable(true);
      mainWindow.setBounds({
        x: sw - MINI_WIDTH - 20,
        y: sh - MINI_HEIGHT - 20,
        width: MINI_WIDTH,
        height: MINI_HEIGHT,
      });
      mainWindow.webContents.send('mode-changed', 'mini');
    } else {
      // Automatically disable mouse pass-through in main workspace so user can interact
      setMouseThrough(false);
      const { width: sw, height: sh } = screen.getPrimaryDisplay().workAreaSize;
      mainWindow.setAlwaysOnTop(false);
      mainWindow.setBounds({
        x: Math.round((sw - MAIN_WIDTH) / 2),
        y: Math.round((sh - MAIN_HEIGHT) / 2),
        width: MAIN_WIDTH,
        height: MAIN_HEIGHT,
      });
      mainWindow.webContents.send('mode-changed', 'main');
    }
  });
}

// --- Mouse Pass-Through State Management & Tray Menu ---
let isMouseThrough = false;

function setMouseThrough(enabled: boolean) {
  isMouseThrough = enabled;
  if (mainWindow && !mainWindow.isDestroyed()) {
    if (isMouseThrough) {
      mainWindow.setIgnoreMouseEvents(true, { forward: true });
    } else {
      mainWindow.setIgnoreMouseEvents(false);
    }
    mainWindow.webContents.send('mouse-through-changed', isMouseThrough);
  }
  updateTrayMenu();
}

function updateTrayMenu() {
  if (!tray) return;

  const contextMenu = Menu.buildFromTemplate([
    {
      label: '🌟 显示主工作台',
      click: () => {
        if (!mainWindow) {
          createWindow();
        } else {
          mainWindow.show();
          mainWindow.focus();
          if (currentMode === 'mini') {
            ipcMain.emit('set-window-mode', null, 'main');
          }
        }
      },
    },
    {
      label: '🪟 切换桌面赛博立牌小窗',
      click: () => {
        if (!mainWindow) createWindow();
        mainWindow?.show();
        const nextMode = currentMode === 'main' ? 'mini' : 'main';
        ipcMain.emit('set-window-mode', null, nextMode);
      },
    },
    { type: 'separator' },
    {
      label: isMouseThrough ? '🛡️ 鼠标穿透 (游戏模式): [已开启 ✓ 点击关闭]' : '🎯 鼠标穿透 (游戏防误触): [已关闭 点击开启]',
      type: 'checkbox',
      checked: isMouseThrough,
      click: (menuItem) => {
        setMouseThrough(menuItem.checked);
      },
    },
    { type: 'separator' },
    {
      label: '⌨️ 快捷键说明',
      submenu: [
        { label: 'Alt + Space : 快速呼出/隐藏主窗口', enabled: false },
        { label: 'Ctrl + Alt + M : 快速切换鼠标穿透', enabled: false },
      ],
    },
    { type: 'separator' },
    {
      label: '🚪 彻底退出 AstralDesk',
      click: () => {
        isQuitting = true;
        app.quit();
      },
    },
  ]);

  tray.setContextMenu(contextMenu);
  tray.setToolTip(`AstralDesk - 星轨 AI 桌面伴侣 ${isMouseThrough ? '【🎮 鼠标穿透中】' : ''}`);
}

function createTraySafe() {
  try {
    const icon = getIcon();
    if (icon.isEmpty()) return;

    tray = new Tray(icon.resize({ width: 16, height: 16 }));
    updateTrayMenu();

    // Left click on tray icon toggles the window
    tray.on('click', () => {
      toggleWindow();
    });

    // Double click on tray icon shows and focuses window
    tray.on('double-click', () => {
      if (mainWindow) {
        mainWindow.show();
        mainWindow.focus();
      }
    });
  } catch (e) {
    console.error('Tray creation skipped', e);
  }
}

// --- AstrBot Native SQLite Real-Time Observer (0% CPU, 100% Proactive Push Delivery) ---
let lastSeenAstrBotId = 0;
let lastCheckedMtimeMs = 0;
let isQueryingDb = false;
let astrbotSyncInterval: NodeJS.Timeout | null = null;
let astrbotFileWatcher: fs.FSWatcher | null = null;

function getAstrBotQueryScriptPath(): string {
  const possiblePaths = [
    path.join(__dirname, 'astrbot_query.py'),
    path.join(__dirname, '../electron/astrbot_query.py'),
    path.join(process.resourcesPath || '', 'app', 'dist-electron', 'astrbot_query.py'),
    path.join(process.resourcesPath || '', 'app', 'electron', 'astrbot_query.py'),
    'D:\\AICONVESTAINO\\electron\\astrbot_query.py',
  ];
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) return p;
  }
  return path.join(__dirname, 'astrbot_query.py');
}

function initAstrBotNativeSync() {
  const dbPath = path.join(os.homedir(), '.astrbot', 'data', 'data_v4.db');
  const dbWalPath = path.join(os.homedir(), '.astrbot', 'data', 'data_v4.db-wal');
  const dataDir = path.join(os.homedir(), '.astrbot', 'data');
  const scriptPath = getAstrBotQueryScriptPath();

  // Query highest existing ID to initialize lastSeenAstrBotId cleanly
  execFile('python', [scriptPath, 'max_id'], { windowsHide: true }, (err, stdout) => {
    if (!err && stdout) {
      const parsedId = parseInt(stdout.trim(), 10);
      if (!isNaN(parsedId) && parsedId > 0) {
        lastSeenAstrBotId = parsedId;
      }
    }
  });

  const checkNewMessages = (force = false) => {
    if (isQueryingDb) return;
    if (!fs.existsSync(dbPath)) return;

    // Ultra-fast 0% CPU mtime guard: only spawn python if database was actually written to
    let currentMtime = 0;
    try {
      if (fs.existsSync(dbWalPath)) {
        currentMtime = Math.max(fs.statSync(dbPath).mtimeMs, fs.statSync(dbWalPath).mtimeMs);
      } else {
        currentMtime = fs.statSync(dbPath).mtimeMs;
      }
    } catch {
      return;
    }

    if (!force && currentMtime > 0 && currentMtime === lastCheckedMtimeMs) {
      return; // 0% CPU: no database changes
    }
    lastCheckedMtimeMs = currentMtime;
    isQueryingDb = true;

    execFile('python', [scriptPath, 'query_new', String(lastSeenAstrBotId)], {
      windowsHide: true,
      maxBuffer: 10 * 1024 * 1024,
    }, (err, stdout) => {
      isQueryingDb = false;
      if (err || !stdout) return;
      try {
        const list = JSON.parse(stdout.trim());
        if (Array.isArray(list) && list.length > 0) {
          for (const item of list) {
            if (item.id > lastSeenAstrBotId) {
              lastSeenAstrBotId = item.id;
            }
            if (item.text && mainWindow && !mainWindow.isDestroyed()) {
              mainWindow.webContents.send('astrbot:new-push-message', item);
            }
          }
        }
      } catch {}
    });
  };

  // Watch data folder for SQLite write events (immediate trigger)
  if (fs.existsSync(dataDir)) {
    try {
      astrbotFileWatcher = fs.watch(dataDir, (_eventType, filename) => {
        if (filename && filename.startsWith('data_v4.db')) {
          checkNewMessages(true);
        }
      });
    } catch {}
  }

  // Lightweight 0% CPU timer fallback every 2s
  astrbotSyncInterval = setInterval(() => checkNewMessages(false), 2000);

  // Manual fetch for missed messages on renderer request
  ipcMain.handle('astrbot:fetch-missed-messages', async (_event, limit = 5) => {
    return new Promise((resolve) => {
      execFile('python', [scriptPath, 'fetch_missed', String(limit)], {
        windowsHide: true,
        maxBuffer: 10 * 1024 * 1024,
      }, (err, stdout) => {
        if (err || !stdout) {
          resolve([]);
          return;
        }
        try {
          resolve(JSON.parse(stdout.trim()));
        } catch {
          resolve([]);
        }
      });
    });
  });
}

app.whenReady().then(() => {
  // Portable storage directory: strictly inside the extracted application folder (NOT C: drive)
  const appRootDir = app.isPackaged 
    ? path.dirname(process.execPath) 
    : process.cwd();
  const mediaDir = path.join(appRootDir, 'data', 'media_assets');

  if (!fs.existsSync(mediaDir)) {
    try {
      fs.mkdirSync(mediaDir, { recursive: true });
    } catch (e) {
      console.error('Failed to create portable media directory:', e);
    }
  }

  // Handle zero-overhead local asset streaming
  protocol.handle('astral-asset', (request) => {
    try {
      const rawPath = request.url.replace(/^astral-asset:\/\//, '');
      const decoded = decodeURIComponent(rawPath);
      const fullPath = path.join(mediaDir, decoded);
      return net.fetch(`file:///${fullPath.replace(/\\/g, '/')}`);
    } catch (err) {
      console.error('Error handling astral-asset protocol:', err);
      return new Response('Not found', { status: 404 });
    }
  });

  // Save media assets to disk to prevent giant base64 strings in memory
  ipcMain.handle('save-media-asset', async (_event, { name, base64Data }: { name: string; base64Data: string }) => {
    try {
      if (!base64Data || !base64Data.startsWith('data:')) {
        return base64Data;
      }
      const ext = path.extname(name || '') || '.png';
      const safeExt = ext.startsWith('.') ? ext : `.${ext}`;
      const cleanName = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}${safeExt}`;
      const destPath = path.join(mediaDir, cleanName);
      const matches = base64Data.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
      const buffer = matches ? Buffer.from(matches[2], 'base64') : Buffer.from(base64Data, 'base64');
      fs.writeFileSync(destPath, buffer);
      return `astral-asset://${cleanName}`;
    } catch (err) {
      console.error('Failed to save media asset to disk:', err);
      return base64Data;
    }
  });

  initAstrBotNativeSync();
  createWindow();
  createTraySafe();

  try {
    globalShortcut.register('Alt+Space', () => {
      toggleWindow();
    });
    globalShortcut.register('Ctrl+Alt+M', () => {
      setMouseThrough(!isMouseThrough);
    });
  } catch (e) {
    console.error('Global shortcut registration error', e);
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    } else {
      mainWindow?.show();
      mainWindow?.focus();
    }
  });
});

app.on('before-quit', () => {
  isQuitting = true;
  if (astrbotSyncInterval) clearInterval(astrbotSyncInterval);
  if (astrbotFileWatcher) astrbotFileWatcher.close();
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

// Do NOT quit when all windows are closed, stay resident in the system tray!
app.on('window-all-closed', () => {
  // Stay running in system tray
});
