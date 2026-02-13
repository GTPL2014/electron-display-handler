const { app, BrowserWindow, screen, ipcMain } = require('electron')
const path = require('path')

let mainWindow
let projectorWindow

function createWindows() {

    const displays = screen.getAllDisplays()
    const primaryDisplay = screen.getPrimaryDisplay()

    // Close old windows if recreating
    if (mainWindow) mainWindow.close()
    if (projectorWindow) projectorWindow.close()

    // Main (laptop) window
    mainWindow = new BrowserWindow({
        // width: 800,
        // height: 600,
        fullScreen: true,
        x: primaryDisplay.bounds.x + 50,
        y: primaryDisplay.bounds.y + 50,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false
        }
    })

    mainWindow.loadFile('course.html')

    // Projector window if second display exists
    if (displays.length > 1) {

        const projectorDisplay = displays.find(
            d => d.id !== primaryDisplay.id
        )

        if (projectorDisplay) {
            projectorWindow = new BrowserWindow({
                x: projectorDisplay.bounds.x,
                y: projectorDisplay.bounds.y,
                width: projectorDisplay.bounds.width,
                height: projectorDisplay.bounds.height,
                fullscreen: true,
                webPreferences: {
                    preload: path.join(__dirname, 'preload.js'),
                    contextIsolation: true,
                    nodeIntegration: false
                }
            })

            projectorWindow.loadFile('show.html')
        }
    }
}

// IPC Handlers for slide synchronization
ipcMain.on('slide-change', (event, data) => {
    if (projectorWindow && !projectorWindow.isDestroyed()) {
        projectorWindow.webContents.send('update-slide', data)
    }
})

ipcMain.on('presentation-load', (event, data) => {
    if (projectorWindow && !projectorWindow.isDestroyed()) {
        projectorWindow.webContents.send('load-presentation', data)
    }
})

ipcMain.on('video-sync', (event, data) => {
    if (projectorWindow && !projectorWindow.isDestroyed()) {
        projectorWindow.webContents.send('sync-video', data)
    }
})

// Check if projector window exists
ipcMain.handle('has-projector', () => {
    return projectorWindow && !projectorWindow.isDestroyed()
})

app.whenReady().then(() => {

    createWindows()

    screen.on('display-added', () => {
        createWindows()
    })

    screen.on('display-removed', () => {
        if (projectorWindow) {
            projectorWindow.close()
            projectorWindow = null
        }
    })

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindows()
        }
    })
})

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit()
    }
})
