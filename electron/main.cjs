const { app, BrowserWindow, screen } = require('electron');
const path = require('path');
const { fork } = require('child_process');
const isDev = !app.isPackaged;

let mainWindow;
let serverProcess;

function startBackend() {
    // In production, the server is in the resources folder
    const serverPath = isDev
        ? path.join(__dirname, '..', 'server', 'index.js')
        : path.join(process.resourcesPath, 'server', 'index.js');

    const serverDir = path.dirname(serverPath);
    console.log('Starting backend dir:', serverDir);

    const envPath = isDev
        ? path.join(__dirname, '..', 'app.env')
        : path.join(process.resourcesPath, 'app.env');

    serverProcess = fork(serverPath, [], {
        env: {
            ...process.env,
            NODE_ENV: isDev ? 'development' : 'production',
            ENV_PATH: envPath
        },
        cwd: serverDir,
        silent: false
    });

    serverProcess.on('error', (err) => {
        console.error('Failed to start backend process:', err);
    });

    serverProcess.on('exit', (code, signal) => {
        console.log(`Backend process exited with code ${code} and signal ${signal}`);
        if (code !== 0 && !app.isQuitting) {
            // Attempt to restart or alert user
        }
    });
}

function createWindow() {
    const { width, height } = screen.getPrimaryDisplay().workAreaSize;

    mainWindow = new BrowserWindow({
        width: Math.min(1440, width),
        height: Math.min(900, height),
        show: false,
        backgroundColor: '#0f172a', // Matches slate-900
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.cjs')
        },
        icon: path.join(__dirname, '..', 'public', 'icon.png')
    });

    // Load URLs
    if (isDev) {
        mainWindow.loadURL('http://localhost:6444');
        mainWindow.webContents.openDevTools();
    } else {
        mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
    }

    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
    });

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

app.whenReady().then(() => {
    startBackend();
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('before-quit', () => {
    app.isQuitting = true;
    if (serverProcess) {
        serverProcess.kill();
    }
});
