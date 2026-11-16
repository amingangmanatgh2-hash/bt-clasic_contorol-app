const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('node:path');
const { SerialPort } = require('serialport');
let mainWindow;
let activePort;

function broadcast(channel, payload) {
  if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send(channel, payload);
}
function explain(error) {
  const message = String(error?.message || error || 'Unknown error');
  if (/access denied|permission|eacces/i.test(message)) return 'اجازه دسترسی به پورت داده نشد. برنامه‌ای که پورت را اشغال کرده ببندید.';
  if (/busy|in use|ebusy/i.test(message)) return 'این پورت در برنامه دیگری باز است.';
  if (/cannot open|does not exist|enoent|not found/i.test(message)) return 'پورت پیدا نشد. اتصال بلوتوث و شماره COM را بررسی کنید.';
  return `خطا در ارتباط سریال: ${message}`;
}
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1360, height: 940, minWidth: 900, minHeight: 680,
    backgroundColor: '#090d16', autoHideMenuBar: true,
    webPreferences: { preload: path.join(__dirname, 'preload.cjs'), contextIsolation: true, nodeIntegration: false, sandbox: true }
  });
  if (app.isPackaged) mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  else mainWindow.loadURL('http://127.0.0.1:5173');
  mainWindow.webContents.setWindowOpenHandler(({url}) => { shell.openExternal(url); return {action:'deny'}; });
  mainWindow.on('closed', () => { mainWindow = null; });
}
app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});
app.on('window-all-closed', async () => { if (activePort?.isOpen) await new Promise(resolve => activePort.close(resolve)); if (process.platform !== 'darwin') app.quit(); });

ipcMain.handle('bt:list', async () => {
  try {
    const ports = await SerialPort.list();
    return ports.map(port => ({
      name: port.friendlyName || port.manufacturer || `Bluetooth serial · ${port.path}`,
      address: port.path,
      detail: [port.path, port.friendlyName, port.manufacturer].filter(Boolean).join(' · ')
    }));
  } catch (error) { throw new Error(explain(error)); }
});
ipcMain.handle('bt:connect', async (_event, address) => {
  if (activePort?.isOpen) await new Promise(resolve => activePort.close(resolve));
  return new Promise((resolve, reject) => {
    const port = new SerialPort({ path: address, baudRate: 9600, autoOpen: false });
    port.open(error => {
      if (error) return reject(new Error(explain(error)));
      activePort = port;
      port.on('data', buffer => broadcast('bt:data', { data: buffer.toString('utf8') }));
      port.on('error', error => {
        broadcast('bt:status', { connected: false, message: explain(error) });
        if (activePort === port) { activePort = null; if (port.isOpen) port.close(() => {}); }
      });
      port.on('close', () => { if (activePort === port) { activePort = null; activeAddress = null; broadcast('bt:status', {connected:false}); } });
      broadcast('bt:status', { connected: true });
      resolve({ name: address });
    });
  });
});
ipcMain.handle('bt:disconnect', async () => {
  if (!activePort?.isOpen) return;
  const port = activePort; activePort = null;
  await new Promise((resolve, reject) => port.close(error => error ? reject(new Error(explain(error))) : resolve()));
  broadcast('bt:status', { connected: false });
});
ipcMain.handle('bt:send', async (_event, data) => {
  if (!activePort?.isOpen) throw new Error('ابتدا به پورت Bluetooth SPP متصل شوید.');
  await new Promise((resolve, reject) => activePort.write(Buffer.from(data, 'utf8'), error => error ? reject(new Error(explain(error))) : activePort.drain(err => err ? reject(new Error(explain(err))) : resolve())));
});
