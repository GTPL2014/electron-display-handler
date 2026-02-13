const { app, BrowserWindow, screen, ipcMain } = require('electron')
const path = require('path')

// Handle Squirrel events on Windows
if (require('electron-squirrel-startup')) app.quit()

let mainWindow
let projectorWindow
let launchUrl = null // Store URL parameters from deep linking

// Set app as default protocol client
if (process.defaultApp) {
    if (process.argv.length >= 2) {
        app.setAsDefaultProtocolClient('presentationviewer', process.execPath, [path.resolve(process.argv[1])])
    }
} else {
    app.setAsDefaultProtocolClient('presentationviewer')
}

// Handle deep linking on Windows
const gotTheLock = app.requestSingleInstanceLock()

if (!gotTheLock) {
    app.quit()
} else {
    app.on('second-instance', (event, commandLine, workingDirectory) => {
        // Someone tried to run a second instance, focus our window instead
        if (mainWindow) {
            if (mainWindow.isMinimized()) mainWindow.restore()
            mainWindow.focus()

            // Handle URL from command line (Windows)
            const url = commandLine.find(arg => arg.startsWith('presentationviewer://'))
            if (url) {
                handleDeepLink(url)
            }
        }
    })
}

// Handle deep linking on macOS
app.on('open-url', (event, url) => {
    event.preventDefault()
    launchUrl = url
    if (mainWindow) {
        handleDeepLink(url)
    }
})

function handleDeepLink(url) {
    console.log('Deep link received:', url)

    // Parse URL parameters
    // Example: presentationviewer://open?role=teacher&presentation=123
    try {
        const urlObj = new URL(url)
        const params = {}

        urlObj.searchParams.forEach((value, key) => {
            params[key] = value
        })

        console.log('URL Parameters:', params)

        // Send parameters to renderer process
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('url-params', params)
        }
    } catch (error) {
        console.error('Error parsing URL:', error)
    }
}

function createWindows() {

    const displays = screen.getAllDisplays()
    const primaryDisplay = screen.getPrimaryDisplay()

    // Close old windows if recreating
    if (mainWindow) mainWindow.close()
    if (projectorWindow) projectorWindow.close()

    // Main (laptop) window
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        x: primaryDisplay.bounds.x + 50,
        y: primaryDisplay.bounds.y + 50,
        title: 'Presentation Viewer Pro',
        icon: path.join(__dirname, 'build/icon.png'),
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
            enableRemoteModule: false,
            webSecurity: true
        },
        show: false // Don't show until ready
    })

    mainWindow.loadFile('course.html')

    // Show window when ready
    mainWindow.once('ready-to-show', () => {
        mainWindow.show()

        // Handle any launch URL parameters
        if (launchUrl) {
            handleDeepLink(launchUrl)
            launchUrl = null
        }

        // Check command line args for URL (Windows)
        const url = process.argv.find(arg => arg.startsWith('presentationviewer://'))
        if (url) {
            handleDeepLink(url)
        }
    })

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
                title: 'Projector Display',
                icon: path.join(__dirname, 'build/icon.png'),
                webPreferences: {
                    preload: path.join(__dirname, 'preload.js'),
                    contextIsolation: true,
                    nodeIntegration: false,
                    enableRemoteModule: false
                },
                show: false
            })

            projectorWindow.loadFile('show.html')

            projectorWindow.once('ready-to-show', () => {
                projectorWindow.show()
            })
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

// Legacy counter support
ipcMain.on('counter-update', (event, value) => {
    if (projectorWindow && !projectorWindow.isDestroyed()) {
        projectorWindow.webContents.send('update-counter', value)
    }
})

// Check if projector window exists
ipcMain.handle('has-projector', () => {
    return projectorWindow && !projectorWindow.isDestroyed()
})

// Get app version
ipcMain.handle('get-app-version', () => {
    return app.getVersion()
})

// Get app name
ipcMain.handle('get-app-name', () => {
    return app.getName()
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

// Clean up before quit
app.on('before-quit', () => {
    if (mainWindow) mainWindow.removeAllListeners('close')
    if (projectorWindow) projectorWindow.removeAllListeners('close')
})
