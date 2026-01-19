const { app, BrowserWindow, screen, ipcMain } = require('electron')

function createWindows() {
    const targetUrl = 'file:///Users/hoyouncho/pgame2/index.html'

    const primaryDisplay = screen.getPrimaryDisplay()
    const { width: screenWidth, height: screenHeight } = primaryDisplay.bounds

    const width = Math.floor(screenWidth / 3)
    const height = screenHeight

    // Helper to inject scripts (Scrollbar + Auto-focus)
    const injectScripts = (win) => {
        win.webContents.on('did-finish-load', () => {
            // 1. Inject Scrollbar CSS
            win.webContents.insertCSS(`
                ::-webkit-scrollbar {
                    width: 12px;
                    height: 12px;
                    display: block !important;
                }
                ::-webkit-scrollbar-track {
                    background: #000;
                }
                ::-webkit-scrollbar-thumb {
                    background: #444;
                    border-radius: 6px;
                }
                ::-webkit-scrollbar-thumb:hover {
                    background: #666;
                }
            `)

            // 2. Inject Focus Listener
            win.webContents.executeJavaScript(`
                const { ipcRenderer } = require('electron');
                document.addEventListener('mouseenter', () => {
                    ipcRenderer.send('request-focus');
                });
                
                // Backup: check movement if not focused
                document.addEventListener('mousemove', () => {
                    if (!document.hasFocus()) {
                        ipcRenderer.send('request-focus');
                    }
                });
            `)
        })
    }

    // Window 1
    const win1 = new BrowserWindow({
        width: width,
        height: height,
        x: 0,
        y: 0,
        frame: false, // Remove OS frame
        thickFrame: false,
        hasShadow: false,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false // Required for require('electron') in renderer
        }
    })
    win1.loadURL(targetUrl)
    injectScripts(win1)

    // Window 2
    const win2 = new BrowserWindow({
        width: width,
        height: height,
        x: width,
        y: 0,
        frame: false,
        thickFrame: false,
        hasShadow: false,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    })
    win2.loadURL(targetUrl)
    injectScripts(win2)

    // Window 3
    const win3 = new BrowserWindow({
        width: width,
        height: height,
        x: width * 2,
        y: 0,
        frame: false,
        thickFrame: false,
        hasShadow: false,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    })
    win3.loadURL(targetUrl)
    injectScripts(win3)
}

// Handle focus request from renderer
ipcMain.on('request-focus', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    if (win) win.focus()
})

app.whenReady().then(createWindows)

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit()
    }
})

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindows()
    }
})
