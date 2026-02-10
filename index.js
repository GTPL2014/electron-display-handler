const { app, BrowserWindow, screen } = require('electron')

let mainWindow
let projectorWindow

const log = (...args) => {
    console.log('[MAIN]', ...args)
}

const createWindows = () => {
    log('Creating windows...')

    const displays = screen.getAllDisplays()
    const primaryDisplay = screen.getPrimaryDisplay()

    log('Total displays detected:', displays.length)
    displays.forEach((d, i) => {
        log(
            `Display ${i}`,
            'id:', d.id,
            'bounds:', d.bounds,
            'primary:', d.id === primaryDisplay.id
        )
    })

    // Close old windows if they exist (important when re-creating)
    if (mainWindow) {
        log('Closing existing main window')
        mainWindow.close()
        mainWindow = null
    }

    if (projectorWindow) {
        log('Closing existing projector window')
        projectorWindow.close()
        projectorWindow = null
    }

    // Create main (laptop) window
    log('Creating main window on primary display')

    mainWindow = new BrowserWindow({
        width: 800,
        height: 600,
        x: primaryDisplay.bounds.x + 100,
        y: primaryDisplay.bounds.y + 100,
        webPreferences: {
            nodeIntegration: true
        }
    })

    mainWindow.loadFile('index.html')

    // Create projector window if available
    if (displays.length > 1) {
        const projectorDisplay = displays.find(
            d => d.id !== primaryDisplay.id
        )

        if (projectorDisplay) {
            log('Creating projector window on display id:', projectorDisplay.id)

            projectorWindow = new BrowserWindow({
                x: projectorDisplay.bounds.x,
                y: projectorDisplay.bounds.y,
                width: projectorDisplay.bounds.width,
                height: projectorDisplay.bounds.height,
                fullscreen: true,
                webPreferences: {
                    nodeIntegration: true
                }
            })

            projectorWindow.loadFile('show.html')
        } else {
            log('No non-primary display found')
        }
    } else {
        log('No external display detected')
    }
}

app.whenReady().then(() => {
    log('App is ready')

    createWindows()

    // Detect display changes (plug / unplug)
    screen.on('display-added', (event, newDisplay) => {
        log('Display added:', newDisplay.id)
        createWindows()
    })
    screen.on('display-metrics-changed', (e, display, metrics) => {
        log('display-metrics-changed', display.id, metrics)
        // recreateIfNeeded()
    })
    screen.on('display-removed', (event, oldDisplay) => {
        log('Display removed:', oldDisplay.id)

        if (projectorWindow) {
            log('Closing projector window due to display removal')
            projectorWindow.close()
            projectorWindow = null
        }
    })

    setInterval(() => {
        const displays = screen.getAllDisplays()
        log(
            'Heartbeat → displays:',
            displays.map(d => ({
                id: d.id,
                bounds: d.bounds
            }))
        )
    }, 3000)


    app.on('activate', () => {
        log('App activated')
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindows()
        }
    })
})

app.on('window-all-closed', () => {
    log('All windows closed')
    if (process.platform !== 'darwin') {
        app.quit()
    }
})
