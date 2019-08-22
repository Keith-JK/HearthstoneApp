// require the exporst and electron remote
const electron = require('electron')
const remote = electron.remote
const main = remote.require('./main.js')
const path = require('path')
const ipcRenderer = electron.ipcRenderer;

// connecting to database 
const sql = require('mssql');
const keys = require('./config/keys');

// credentials to access the database
const config = keys.SQLConfig;

// Quit App
document.getElementById('quit').addEventListener('click', ()=>{
    var window = remote.getCurrentWindow();
    window.close();
})

//add global variables locally
var myBattleTag = remote.getGlobal('userBattleTag')
var myTrustFactor = remote.getGlobal('userTrustFactor')
console.log(myBattleTag);
console.log(myTrustFactor);
// increase trust
ipcRenderer.send('increaseTrust', 'null');
myTrustFactor += 1;
console.log(myTrustFactor);


// LOAD PARTNER INFO
getPartnerInfo();
// INCREASE TRUST LEVEL
increaseTrustLevel();

function getPartnerInfo(){

    // Connect to configuration
    var conn = new sql.ConnectionPool(config)
    
    // list partner id
    conn.connect().then(function(){
        // sql query
        var queryString = "SELECT * FROM match_table WHERE ((Player1 = @userBattleTag) OR\
                                                            (Player2 = @userBattleTag));";
        var req = new sql.Request(conn);
        req.input('userBattleTag', myBattleTag);
        req.query(queryString).then(function(recordset){
            console.log(recordset);
            var TF1 = recordset.recordset.toTable().rows[0][1];
            var TF2 = recordset.recordset.toTable().rows[0][3];
            // player2 has higher trust than player1 == partner1 is player1
            if(TF2 >= TF1){
                document.getElementById('partner_1').innerHTML = recordset.recordset.toTable().rows[0][0];
                document.getElementById('partner_1_TF').innerHTML = recordset.recordset.toTable().rows[0][1];
                document.getElementById('partner_2').innerHTML = recordset.recordset.toTable().rows[0][2];
                document.getElementById('partner_2_TF').innerHTML = recordset.recordset.toTable.rows[0][3];
            }else{
            // player1 has higher trust than player2 == partner1 is player2
                document.getElementById('partner_2').innerHTML = recordset.recordset.toTable().rows[0][0];
                document.getElementById('partner_2_TF').innerHTML = recordset.recordset.toTable().rows[0][1];
                document.getElementById('partner_1').innerHTML = recordset.recordset.toTable().rows[0][2];
                document.getElementById('partner_1_TF').innerHTML = recordset.recordset.toTable.rows[0][3];
            }
            conn.close()
        }).catch(function(err){
            console.log(err)
            conn.close()
        });

    }).catch(function(err){
        console.log(err)
    });
}

function increaseTrustLevel(){
    var conn = new sql.ConnectionPool(config)

    // Increase Trust level 
    conn.connect().then(function(){
        // sql query
        var queryString = "UPDATE users\
                            SET TrustFactor = @newTrustFactor\
                            WHERE BattleTag = @BattleTag;";
        var req = new sql.Request(conn);
        req.input('BattleTag', myBattleTag);
        req.input('newTrustFactor', myTrustFactor);
        req.query(queryString).then(function(recordset){
            console.log(recordset);
            conn.close()
        }).catch(function(err){
            console.log(err)
            conn.close()
        });

    }).catch(function(err){
        console.log(err)
    });
}

// remove the match after it has been process to lighten matched_table
function removing_match(){
    // Connect to configuration
    var conn = new sql.ConnectionPool(config)

    // Remove prior match from queue
    conn.connect().then(function () {

        remove(myBattleTag);
        
    }).catch(function(err){
        console.log(err);
        conn.close();
    });

    async function remove(userBattleTag){
        await RemoveFromQueue(userBattleTag).then(function (result) {
            if (result) {
                console.log("TEST FAILED: User successfully removed from queue");
                document.getElementById('can-close').innerHTML = "You can safely redirect away from the current page now";
                conn.close();
                clearInterval(interval);

            } else {
                console.log("TEST PASSED: User already removed from queue / Not detected in queue.");
                document.getElementById('can-close').innerHTML = "You can safely redirect away from the current page now";
                conn.close();

                // Redirect back to page.html OR just clear interval ?
                clearInterval(interval);
            }
        }).catch(err => console.log("ERROR: \n" + err));

        conn.close();
    }

    async function RemoveFromQueue(userBattleTag) {
        var queryString = "DELETE FROM match_table WHERE (Player1 = @userBattleTag OR Player2 = @userBattleTag)";
        var req = new sql.Request(conn);
        return new Promise((resolve, reject) => {
            req.input('userBattleTag', userBattleTag).query(queryString)
                .then(function (recordset) {
                    // not deleted == does not exist in queue
                    if (recordset.rowsAffected == 0) { 
                        resolve(false);
                    } else {
                        // successfully deleted from queue
                        resolve(true);
                    }
                }).catch(function (err) {
                    conn.close();
                    reject(err);
                });
        });
    }
}
    

// search for prior match to delete -- set to run only in 7s intervals to accomodate for the other partner SQL 
interval = setInterval(() => {
    removing_match();
}, 7000);