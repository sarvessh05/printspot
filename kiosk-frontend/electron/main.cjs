const { app, BrowserWindow, globalShortcut, Menu, powerSaveBlocker, session } = require('electron');
const path = require('path');
const isDev = require('electron-is-dev');

let mainWindow;
let pId;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1024,
    height: 768,
    fullscreen: true,
    kiosk: true,      // Kiosk mode disables many OS shortcuts
    alwaysOnTop: true,
    frame: false,
    resizable: false,
    movable: false,
    closable: false,  // Prevent accidental closing
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      preload: path.join(__dirname, 'preload.cjs'),
      devTools: isDev, // Disable devTools in production
    },
  });

  // Block all popups
  mainWindow.webContents.setWindowOpenHandler(() => {
    return { action: 'deny' };
  });

  // Deny all permission requests (camera, mic, etc.) unless explicitly needed
  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    return callback(false);
  });

  // Hide the menu bar completely
  Menu.setApplicationMenu(null);

  // Disable context menu
  mainWindow.webContents.on('context-menu', (e) => {
    e.preventDefault();
  });

  // Prevent navigation to external URLs
  mainWindow.webContents.on('will-navigate', (e, url) => {
    if (!isDev && !url.startsWith('file://')) {
      e.preventDefault();
    }
  });

  const startUrl = isDev 
    ? 'http://localhost:5174' 
    : `file://${path.join(__dirname, '../dist/index.html')}`;

  mainWindow.loadURL(startUrl);

  // Disable zooming
  mainWindow.webContents.on('did-finish-load', () => {
    mainWindow.webContents.setVisualZoomLevelLimits(1, 1);
  });

  // Handle renderer process crashes
  mainWindow.webContents.on('render-process-gone', (event, details) => {
    console.error('Renderer process gone:', details.reason);
    if (details.reason !== 'killed') {
      app.relaunch();
      app.exit();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Security: Disable system-level shortcuts
app.on('ready', () => {
  // Prevent the system from going to sleep
  pId = powerSaveBlocker.start('prevent-display-sleep');

  createWindow();

  // Expanded list of forbidden shortcuts
  const forbiddenShortcuts = [
    'CommandOrControl+W',
    'CommandOrControl+R',
    'CommandOrControl+Shift+I',
    'CommandOrControl+Shift+R',
    'CommandOrControl+N',
    'CommandOrControl+O',
    'CommandOrControl+S',
    'CommandOrControl+P',
    'CommandOrControl+F',
    'Alt+F4',
    'Alt+Tab',
    'F11',
    'F12',
    'Super+D', // Windows key + D
    'Super+R', // Windows key + R
  ];

  forbiddenShortcuts.forEach(shortcut => {
    try {
      globalShortcut.register(shortcut, () => {
        console.log(`Shortcut ${shortcut} is disabled.`);
        if (isDev) {
          if (shortcut === 'CommandOrControl+R') mainWindow.reload();
          if (shortcut === 'CommandOrControl+Shift+I') mainWindow.webContents.openDevTools();
        }
      });
    } catch (e) {
      console.warn(`Could not register shortcut ${shortcut}:`, e);
    }
  });
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
  if (pId !== undefined) {
    powerSaveBlocker.stop(pId);
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});
