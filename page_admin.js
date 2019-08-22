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

// send url request with searchbattletag
const OnlineBlacklisturl = "https://www.hearthpwn.com/forums/hearthstone-general/players-and-teams-discussion/214403-80g-quest-trading-play-a-friend-7#c2";

// QUEST TRADING
document.getElementById('quest_trade').addEventListener('click', () =>{
    // get user battletag
    var search_battletag = remote.getGlobal('userBattleTag');

    // initialise empty body
    var body = '';

    // use strings to signify checks
    var check_progress = "empty";

    // checks online blacklist first
    request(OnlineBlacklisturl)
        .on('data', chunk => {
            if(chunk.includes('<thead>')){
                body += chunk;
            };
        })
        .on('end', () => {
            if(body !== ''){
                if(search_battletag == 'Rollewurst#2144'){
                    // this guy special snowflake
                    check_progress = "unconfirmed, checking SQL";
                    console.log('special snowflake');
                }else if(body.includes(search_battletag)){
                    // guy in blacklist
                    check_progress = "confirmed blacklisted";
                    document.getElementById('quest-denied').innerHTML = "User is blacklisted, and is not allowed to trade";
                    console.log(check_progress);
                }else{
                    // guy not in blacklist
                    check_progress = "unconfirmed, checking SQL";
                    console.log(check_progress);
                }
            }else{
                // some problem happened and body is empty
                check_progress = "unconfirmed, checking SQL";
                console.log('error, retrieving data from online blacklist: empty body');
            }

            // SQL query only if not in online blacklist
            if(check_progress == "unconfirmed, checking SQL"){
                console.log("checking SQL");
                
                //SQL query to blacklist table to test

                // importing keys, create new connection
                var conn = new sql.ConnectionPool(keys.SQLConfig);

                conn.connect().then(function (){
                    
                    var req = new sql.Request(conn);
                    queryBattleTag = search_battletag;
                    var queryString = "SELECT * FROM blacklist WHERE BattleTag = @queryBattleTag;";
                    
                    req.input('queryBattleTag', queryBattleTag).query(queryString)
                        .then(function (recordset) {
                            if(recordset.rowsAffected == 0) { 
                                // not inside blacklist
                                console.log("not in both blacklist");

                                var window = remote.getCurrentWindow();
                                // open the html file quest_search.html
                                main.openWindow('quest_search_admin');
                                window.close();
                                
                            }else{ 
                                // inside blacklist
                               document.getElementById('quest-denied').innerHTML = "User is blacklisted, and is not allowed to trade";
                                console.log("BattleTag is blacklisted in database");
                            }
                            conn.close();
                        }).catch(function (err) {
                            // failure to query
                            console.log(err);
                            conn.close();
                        });
                }).catch(function(err){
                    // failure to connect
                    console.log(err);
                });
            }
            // end of SQL if needed
        })
        .on('error', (err) => {
            console.log('error connecting to online blacklist: empty body');
            console.log(err);
        });
    
});

// BLACKLIST SEARCH
document.getElementById('submitSearch').addEventListener('click', () => {
    
    // search_battletag is battletag we need to search for
    const search_battletag = document.getElementById('blacklist_search').value;
    console.log(search_battletag);

    // checks if empty or weird text(SQL inject)
    if(search_battletag == "" || search_battletag.includes("'") || search_battletag.includes(" ") || search_battletag.includes('"') 
    || search_battletag.includes("*") || search_battletag.includes("/") || !(search_battletag.includes("#"))){
        document.getElementById('blacklist_search_response').innerHTML = "Invalid BattleTag, a valid battletag example: exampleuser1#1111";
        console.log("Weird text detected!")
        return;
    }
    
    // reset hidden text InnerHTML
    document.getElementById('blacklist_search_response').innerHTML = "Searching...";

    // initialise empty body
    var body = '';

    // use strings to signify checks
    var check_progress = "empty";

    // checks online blacklist first
    request(OnlineBlacklisturl)
        .on('data', chunk => {
            if(chunk.includes('<thead>')){
                body += chunk;
            };
        })
        .on('end', () => {
            if(body !== ''){
                if(search_battletag == 'Rollewurst#2144'){
                    // this guy special snowflake
                    check_progress = "unconfirmed, checking SQL";
                    console.log('special snowflake');
                }else if(body.includes(search_battletag)){
                    // guy in blacklist
                    check_progress = "confirmed blacklisted";
                    document.getElementById('blacklist_search_response').innerHTML = "BattleTag is blacklisted";
                    console.log(check_progress);
                }else{
                    // guy not in blacklist
                    check_progress = "unconfirmed, checking SQL";
                    console.log(check_progress);
                    document.getElementById('blacklist_search_response').innerHTML = "...checking database";
                }
            }else{
                // some problem happened and body is empty
                check_progress = "unconfirmed, checking SQL";
                console.log('error, retrieving data from online blacklist: empty body');
                document.getElementById('blacklist_search_response').innerHTML = "...checking database";
            }

            // SQL query only if not in online blacklist
            if(check_progress == "unconfirmed, checking SQL"){
                console.log("checking SQL");
                
                //SQL query to blacklist table to test
                const sql = require('mssql');
                const keys = require('./config/keys');

                // importing keys
                var conn = new sql.ConnectionPool(keys.SQLConfig);

                conn.connect().then(function (){
                    
                    var req = new sql.Request(conn);
                    queryBattleTag = search_battletag;
                    var queryString = "SELECT * FROM blacklist WHERE BattleTag = @queryBattleTag;";
                    
                    req.input('queryBattleTag', queryBattleTag).query(queryString)
                        .then(function (recordset) {
                            if(recordset.rowsAffected == 0) { 
                                // not inside blacklist
                                document.getElementById('blacklist_search_response').innerHTML = "BattleTag is not blacklisted";
                                console.log("not in both blacklist");
                            }else{ 
                                // inside blacklist
                                document.getElementById('blacklist_search_response').innerHTML = "BattleTag is blacklisted";
                                console.log("BattleTag is blacklisted in database");
                            }
                            conn.close();
                        }).catch(function (err) {
                            // failure to query
                            console.log(err);
                            document.getElementById('blacklist_search_response').innerHTML = "error retrieving data";
                            conn.close();
                        });
                }).catch(function(err){
                    // failure to connect
                    console.log(err);
                    document.getElementById('blacklist_search_response').innerHTML = "error retrieving data";
                });
            }
            // end of SQL if needed
        })
        .on('error', (err) => {
            console.log('error connecting to online blacklist: empty body');
            console.log(err);
            document.getElementById('blacklist_search_response').innerHTML = "error retrieving data";
        });
    
});