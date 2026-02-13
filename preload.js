const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('api', {
    // Slide synchronization
    sendSlideChange: (data) => {
        ipcRenderer.send('slide-change', data)
    },
    onSlideUpdate: (callback) => {
        ipcRenderer.on('update-slide', (event, data) => {
            callback(data)
        })
    },

    // Presentation loading
    sendPresentationLoad: (data) => {
        ipcRenderer.send('presentation-load', data)
    },
    onPresentationLoad: (callback) => {
        ipcRenderer.on('load-presentation', (event, data) => {
            callback(data)
        })
    },

    // Video synchronization
    sendVideoSync: (data) => {
        ipcRenderer.send('video-sync', data)
    },
    onVideoSync: (callback) => {
        ipcRenderer.on('sync-video', (event, data) => {
            callback(data)
        })
    },

    // Check if projector window exists
    hasProjector: () => {
        let hasProjector = ipcRenderer.invoke('has-projector');
        return hasProjector;
    },

    // URL Parameters / Deep Linking
    onUrlParams: (callback) => {
        ipcRenderer.on('url-params', (event, params) => {
            callback(params)
        })
    },

    // App info
    getAppVersion: () => {
        return ipcRenderer.invoke('get-app-version')
    },

    getAppName: () => {
        return ipcRenderer.invoke('get-app-name')
    }
})
