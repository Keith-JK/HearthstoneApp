// require the exporst and electron remote
const electron = require('electron')
const remote = electron.remote
const main = remote.require('./main.js')
const path = require('path')

// connecting to database 
const sql = require('mssql');
const keys = require('./config/keys');

// credentials to access the database
const config = keys.SQLConfig;


// Connect to configuration
var conn = new sql.ConnectionPool(config)

//add global variables
var myBattleTag = remote.getGlobal('userBattleTag')
var myAccountId = remote.getGlobal('userAccountId')
console.log(myBattleTag);
console.log(myAccountId);
 
// ADD to search first thing once enter the page
conn.connect().then(function () {

    add(myBattleTag, trustFactor);
    
}).catch(function(err){
    console.log(err);
    conn.close();
});

async function add(userBattleTag, trustFactor) {
    // Step 1: Check if there is a slot available
    // Step 2: Add 1 guy to the queue
    console.log("Step 2: Adding 1 guy to the queue...");
    await AddToQueue(userBattleTag, trustFactor).then(function (result) {
        console.log("TEST PASSED:" + userBattleTag + "has been added!");
    }).catch(err => console.log("ERROR AT STEP #2: \n" + err));

    conn.close();
}

// check if 1 player in queue that is not matched with another 
async function isSlotAvailable() {
    var queryString = "SELECT * from match_table WHERE Player2 IS NULL";
    var req = new sql.Request(conn);
    return new Promise((resolve, reject) => {
        req.query(queryString)
            .then(function (recordset) {
                if (recordset.rowsAffected == 0) { // no slots found.
                    resolve(false);
                } else {
                    resolve(true);
                }
            }).catch(function (err) {
                conn.close();
                reject(err);
            });
    });
}

// Add to queue and wait for match OR add to pre existing row of player
async function AddToQueue(userBattleTag, trustFactor) {
    var queryString;
    await isSlotAvailable().then(function (result, err) {
        if (result) {
            queryString = "UPDATE match_table\
                            SET Player2 = @userBattleTag\
                            SET Player2_Trust = @trustFactor\
                            WHERE Player2 IS NULL;";
            console.log("Found a slot to place myself in!");
        } else {
            queryString = "INSERT INTO match_table(Player1, Player1_Trust) VALUES(@userBattleTag, @trustFactor);";
            console.log("Found no slots to place myself in!");
        }
    }).catch(err => console.log(err));
    return new Promise(function (resolve, reject) {
        var req = new sql.Request(conn);
        req.input('userBattleTag', userBattleTag)
            .input('trustFactor', trustFactor)
            .query(queryString)
            .then(function (recordset) {
                // If 1 row affected, then good.
                if (recordset.rowsAffected == 1) {
                    resolve(recordset);
                } else { // not good.
                    reject(recordset);
                }
            }).catch(function (err) {
                reject(err);
            });
    });
}


// CANCELLING SEARCH
document.getElementById('cancel_search').addEventListener('click', () => {
    // Send SQL to REMOVE from queue
    // Connect to configuration
    var conn = new sql.ConnectionPool(config)

    // connecting
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
                conn.close();

                // Redirect back to page.html
                var window = remote.getCurrentWindow();
                // opens page.html
                main.openWindow('page');
                // this should kill all process
                window.close();
            } else {
                console.log("TEST PASSED: User already removed from queue / Not detected in queue.");
                conn.close();

                // Redirect back to page.html
                var window = remote.getCurrentWindow();
                // opens page.html
                main.openWindow('page');
                // this should kill all process
                window.close();
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
});




//fake interval testing function
function matching(){
    // Connect to configuration
    var conn = new sql.ConnectionPool(config)

    // list all table id
    conn.connect().then(function () {
        
        matched(myBattleTag);
        
    }).catch(function(err){
        console.log(err);
        conn.close();
    });

    async function matched(userBattleTag) {
       
        // Step 6: Check if match has been found for user 1
        console.log("Step 6: Checking to see if a match has been found for user 1...");
        await CheckIfMatchFound(userBattleTag).then(function (result) {
            if (result) {
                console.log(result);
                console.log("TEST PASSED: Match has been found!");

                // prepare to redirect
                console.log("connnection closing, match found");
                conn.close();

                // Redirect to partner_info.html
                var window = remote.getCurrentWindow();
                // opens page.html
                main.openWindow('partner_info');
                // this should kill all process
                window.close();

            } else {
                console.log("TEST FAILED: Match has not been found!")
            }
        }).catch(err => console.log("ERROR AT STEP #6: \n" + err));

        console.log("conn closing, prepare to search again");
        conn.close();
    }

    // match is made when player 1 and 2 is filled for a single row
    async function CheckIfMatchFound(userBattleTag) {
        var queryString = "SELECT * FROM match_table WHERE ((Player1 = @userBattleTag AND Player2 IS NOT NULL) OR\
                                                            (Player1 IS NOT NULL AND Player2 = @userBattleTag));";
        var req = new sql.Request(conn);
        
        return new Promise((resolve, reject) => {
            req.input('userBattleTag', userBattleTag).query(queryString)
                .then(function (recordset) {
                    // not inside table == no matches found
                    if (recordset.rowsAffected == 0) { 
                        resolve(false);
                    } else {
                        resolve(true);
                    }
                }).catch(function (err) {
                    console.log(err);
                    reject(err);
                });
        });
    }
}

// search for matches set to run only in 5s intervals 
setInterval(() => {
    matching();
}, 5000);