// this is to include openWindow exports and electron remote
const electron = require('electron')
const remote = electron.remote
const main = remote.require('./main.js')
const path = require('path')
const request = require('request');
const ipcRenderer = electron.ipcRenderer

//credentials for SQL
const sql = require('mssql');
const keys = require('./config/keys');

// Quit App
document.getElementById('quit').addEventListener('click', ()=>{
    var window = remote.getCurrentWindow();
    window.close();
})

// Redirection
document.getElementById('startup').addEventListener('click', ()=>{
    //query admin table
    var myBattleTag = "";
    myBattleTag = remote.getGlobal('userBattleTag');

    // authentication process skipped == force close
    if(myBattleTag == null){
        var window = remote.getCurrentWindow();
        window.close();
    }

    var adminStatus = false;

    // console logging to check
    console.log("user:" + remote.getGlobal('userBattleTag'));

    //SQL query to admin table
    var conn = new sql.ConnectionPool(keys.SQLConfig);

    conn.connect().then(function (){
        
        var req = new sql.Request(conn);
        queryBattleTag = myBattleTag;
        var queryString = "SELECT * FROM admin_table WHERE BattleTag = @queryBattleTag;"; 
        
        req.input('queryBattleTag', queryBattleTag).query(queryString)
            .then(function (recordset) {
                if(recordset.rowsAffected == 1){ 
                    console.log("is admin");
                    adminStatus = true;
                }
                conn.close();

                var window = remote.getCurrentWindow();
                if(adminStatus){
                    // open page_admin
                    main.openWindow('page_admin');
                    window.close();
                }else{
                    main.openWindow('page');
                    window.close();
                } 
            }).catch(function (err) {
                // failure to query
                console.log(err);
                conn.close();
            });
    }).catch(function(err){
        // failure to connect
        console.log(err);
    });

})