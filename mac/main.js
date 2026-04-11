const { app, BrowserWindow, Menu, shell, ipcMain, dialog } = require('electron');
const path = require('path');

// ============ CONFIG ============
const APP_URL = 'https://student-portal-r2tp.vercel.app/';
const UNITY_GAME_ID = '6086635';
const WINDOW_WIDTH = 1200;
const WINDOW_HEIGHT = 800;
const MIN_WIDTH = 900;
const MIN_HEIGHT = 600;

let mainWindow = null;
let adWindow = null;

// ============ SINGLE INSTANCE LOCK ============
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}

// ============ CREATE MAIN WINDOW ============
function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: WINDOW_WIDTH,
    height: WINDOW_HEIGHT,
    minWidth: MIN_WIDTH,
    minHeight: MIN_HEIGHT,
    title: 'Vignan Portal',
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 16, y: 16 },
    backgroundColor: '#f8fafc',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
    show: false,
    icon: path.join(__dirname, 'icon.png'),
  });

  // Graceful loading — show window only when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.focus();
  });

  // Load the live Vercel backend
  mainWindow.loadURL(APP_URL);

  // Handle external links — open in default browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // Handle navigation to external URLs
  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith(APP_URL) && !url.startsWith('https://student-portal')) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// ============ AD WINDOW (for Unity Ads interstitials) ============
function createAdWindow() {
  if (adWindow) {
    adWindow.focus();
    return;
  }

  adWindow = new BrowserWindow({
    width: 800,
    height: 600,
    parent: mainWindow,
    modal: true,
    resizable: false,
    title: 'Ad',
    backgroundColor: '#000000',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
    show: false,
  });

  adWindow.loadFile(path.join(__dirname, 'ads.html'));

  adWindow.once('ready-to-show', () => {
    adWindow.show();
  });

  adWindow.on('closed', () => {
    adWindow = null;
    // Notify the main window that the ad was completed
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('ad-completed', { state: 'COMPLETED' });
    }
  });
}

// ============ IPC HANDLERS ============
ipcMain.handle('show-unity-ad', async () => {
  createAdWindow();
  return { success: true };
});

ipcMain.handle('close-ad-window', async () => {
  if (adWindow && !adWindow.isDestroyed()) {
    adWindow.close();
  }
  return { success: true };
});

ipcMain.handle('get-app-info', async () => {
  return {
    platform: 'mac',
    version: app.getVersion(),
    unityGameId: UNITY_GAME_ID,
  };
});

// ============ MENU BAR ============
function createMenu() {
  const template = [
    {
      label: app.name,
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        {
          label: 'Preferences...',
          accelerator: 'Cmd+,',
          click: () => {
            // Could open settings in the future
          },
        },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' },
      ],
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' },
      ],
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
      ],
    },
    {
      label: 'Navigate',
      submenu: [
        {
          label: 'Dashboard',
          accelerator: 'Cmd+1',
          click: () => {
            if (mainWindow) mainWindow.loadURL(APP_URL + 'dashboard');
          },
        },
        {
          label: 'Results',
          accelerator: 'Cmd+2',
          click: () => {
            if (mainWindow) mainWindow.loadURL(APP_URL + 'results');
          },
        },
        {
          label: 'Announcements',
          accelerator: 'Cmd+3',
          click: () => {
            if (mainWindow) mainWindow.loadURL(APP_URL + 'announcements');
          },
        },
        {
          label: 'Profile',
          accelerator: 'Cmd+4',
          click: () => {
            if (mainWindow) mainWindow.loadURL(APP_URL + 'profile');
          },
        },
        { type: 'separator' },
        {
          label: 'Back to Login',
          accelerator: 'Cmd+L',
          click: () => {
            if (mainWindow) mainWindow.loadURL(APP_URL);
          },
        },
      ],
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'zoom' },
        { type: 'separator' },
        { role: 'front' },
        { type: 'separator' },
        { role: 'close' },
      ],
    },
    {
      role: 'help',
      submenu: [
        {
          label: 'Privacy Policy',
          click: () => {
            shell.openExternal(APP_URL + 'privacy.html');
          },
        },
        {
          label: 'Report Issue',
          click: () => {
            shell.openExternal('mailto:support@vignanportal.com');
          },
        },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// ============ APP LIFECYCLE ============
app.whenReady().then(() => {
  createMenu();
  createMainWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Security: prevent new window creation
app.on('web-contents-created', (event, contents) => {
  contents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
});

// Dev tools in dev mode
if (process.argv.includes('--dev')) {
  app.whenReady().then(() => {
    if (mainWindow) {
      mainWindow.webContents.openDevTools({ mode: 'detach' });
    }
  });
}
