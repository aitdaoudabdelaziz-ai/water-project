// نظام الإدارة والأرشفة — جمعية الفتح للتنمية و التعاون (نسخة الحاسوب)
const { app, BrowserWindow, ipcMain, shell, dialog, Menu } = require('electron');
const path = require('path');
const fs = require('fs');

app.setName('AlFath Archive');
if (!app.requestSingleInstanceLock()) { app.quit(); }

let win = null;

function createWindow() {
  win = new BrowserWindow({
    width: 1280, height: 820, minWidth: 900, minHeight: 600,
    title: 'نظام الإدارة والأرشفة — جمعية الفتح للتنمية و التعاون',
    icon: path.join(__dirname, 'build', 'icon.png'),
    backgroundColor: '#f2f5f8',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      spellcheck: false
    }
  });
  Menu.setApplicationMenu(null);
  win.loadFile(path.join(__dirname, 'app', 'index.html'));
  win.once('ready-to-show', () => { win.maximize(); win.show(); });

  // نوافذ الطباعة والمعاينة داخل البرنامج، والروابط الخارجية في المتصفح
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url === '' || url === 'about:blank' || url.startsWith('blob:')) {
      return { action: 'allow', overrideBrowserWindowOptions: {
        width: 1000, height: 800, title: 'طباعة / معاينة', autoHideMenuBar: true,
        icon: path.join(__dirname, 'build', 'icon.png'),
        webPreferences: { contextIsolation: true, nodeIntegration: false }
      } };
    }
    if (/^https?:\/\//.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', (e, url) => { if (!url.startsWith('file:')) e.preventDefault(); });
  win.on('closed', () => { win = null; });
}

// فتح وثيقة مؤرشفة بالبرنامج الافتراضي في الحاسوب (PDF، Word، صور...)
ipcMain.handle('open-file', async (_e, name, buf) => {
  const dir = path.join(app.getPath('temp'), 'alfath-archive');
  fs.mkdirSync(dir, { recursive: true });
  const p = path.join(dir, Date.now() + '-' + path.basename(String(name || 'file')));
  fs.writeFileSync(p, Buffer.from(buf));
  const err = await shell.openPath(p);
  return err === '';
});

// حفظ ملف (نسخة احتياطية أو وثيقة) في المكان الذي يختاره المستخدم
ipcMain.handle('save-file', async (_e, name, buf) => {
  const r = await dialog.showSaveDialog(win, {
    title: 'حفظ الملف',
    defaultPath: path.join(app.getPath('documents'), path.basename(String(name || 'file')))
  });
  if (r.canceled || !r.filePath) return false;
  fs.writeFileSync(r.filePath, Buffer.from(buf));
  return true;
});

app.on('second-instance', () => { if (win) { if (win.isMinimized()) win.restore(); win.focus(); } });
app.whenReady().then(createWindow);
app.on('window-all-closed', () => app.quit());
