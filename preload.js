const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('api', {
    sendCounter: (value) => {
        ipcRenderer.send('counter-update', value)
    },
    onCounterUpdate: (callback) => {
        ipcRenderer.on('update-counter', (event, value) => {
            callback(value)
        })
    }
})
