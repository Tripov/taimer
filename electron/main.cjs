const { app, BrowserWindow, ipcMain, Notification } = require('electron');
const path = require('node:path');

const isDev = !app.isPackaged;

function createWindow() {
  const window = new BrowserWindow({
    width: 1120,
    height: 760,
    minWidth: 720,
    minHeight: 650,
    title: 'Тихий час',
    backgroundColor: '#f4f0e8',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  window.once('ready-to-show', () => window.show());

  if (isDev) {
    window.loadURL('http://localhost:5173');
  } else {
    window.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }

  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
}

ipcMain.on('timer:finished', () => {
  if (Notification.isSupported()) {
    new Notification({
      title: 'Время вышло!',
      body: 'Таймер завершён — пора сделать паузу.',
      silent: true,
    }).show();
  }

  const window = BrowserWindow.getAllWindows()[0];
  if (window) {
    if (window.isMinimized()) window.restore();
    window.show();
    window.flashFrame(true);
  }
});

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
