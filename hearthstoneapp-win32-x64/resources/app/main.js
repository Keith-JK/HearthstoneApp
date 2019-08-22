const electron = require('electron');
const path = require('path');
const url = require('url');
const {app, BrowserWindow, ipcMain, Menu} = electron;

const server = require('./app.js')

// window object
let loginWin;
let mainWin

// create the window on start
function createWindow(){
    // create browser window
    mainWin = new BrowserWindow({
        width:800, 
        height: 600, 
        show: false,
        frame: false,
        webPreferences:{
            nodeIntegration: true
        }
    });

    // load _______ path on start up
    mainWin.loadURL(url.format({
        pathname: path.join(__dirname, 'startup.html'),
        protocol: 'file:',
        slashes: true
    }));

    Menu.setApplicationMenu(null);

    // Dev Tools
    // mainWin.webContents.openDevTools();

    // Emitted when the window closed
    mainWin.on('closed', () => {
        mainWin = null;
    })
}

function createLoginWindow(){
    loginWin = new BrowserWindow({
        width:800,
        height:600,
        alwaysOnTop:true,
        webPreferences:{
            nodeIntegration: true
        }
    });

    loginWin.loadURL('http://localhost:3000/');

    // loginWin.webContents.openDevTools();
    Menu.setApplicationMenu(null);

    loginWin.on('closed', () =>{
        loginWin = null;
        mainWin.show();
    });
}

// node-ipc server for communicating with express server
const ipc= require('node-ipc');
ipc.config.id = 'world';
ipc.config.retry= 1500;

ipc.serve(
    function(){
        ipc.server.on(
            'battletag',
            function(data,socket){
                // initialise global BattleTag
                global.userBattleTag = data.message;
                // broadcast to all client if needed
                /* ipc.server.emit(
                    socket,
                    'app.message',
                    {
                        id      : ipc.config.id,
                        message : 'BattleTag: ' + data.message
                    }
                ); */
            }
        );
        ipc.server.on(
            'trustFactor',
            function(data,socket){
                // initialise global BattleTag
                global.userTrustFactor = data.message;
                // broadcast to all client if needed
                /* ipc.server.emit(
                    socket,
                    'app.message',
                    {
                        id      : ipc.config.id,
                        message : 'BattleTag: ' + data.message
                    }
                ); */
            }
        );
    }
);

ipc.server.start();

function onStartUp(){
    createLoginWindow();
    createWindow();
}

// run create window
app.on('ready', onStartUp);

// quit when window closed 
app.on('window-all-closed', () => {
    // quit all app
    if(process.platform !== 'darwin'){
        app.quit();
    }
});

ipcMain.on('increaseTrust', (event,args) =>{
    global.userTrustFactor += 1;
});

// exporting create window module
exports.openWindow = (filename) => {
    let win = new BrowserWindow({
        width:800,
        height:600, 
        frame: false,
        webPreferences:{
            nodeIntegration:true
        } 
    });
    //win.webContents.openDevTools();
    win.loadURL(`file://${__dirname}/` + filename + `.html`);
}