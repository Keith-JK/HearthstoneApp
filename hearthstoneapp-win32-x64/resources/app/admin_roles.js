const electron = require('electron')
const remote = electron.remote
const main = remote.require('./main.js')
const path = require('path')

// credentials to access the database
const sql = require('mssql');
const keys = require('./config/keys');

// credentials to access the database
const config = keys.SQLConfig;

// Quit App
document.getElementById('quit').addEventListener('click', ()=>{
    var window = remote.getCurrentWindow();
    window.close();
})

document.getElementById('add-blacklist').addEventListener('click', () => {
    // SQL add 
    var addUserTag = document.getElementById('input-tag').value;
    var addAccountID = "NULL";

    // Connect to configuration
    var conn = new sql.ConnectionPool(config)
    
    // list all table id
    conn.connect().then(function () {

        add_to_blacklist(addUserTag, addAccountID);
        
    }).catch(function(err){
        console.log(err);
        conn.close();
    });

    async function add_to_blacklist(userID, AccountID) {

        await AddBattletagToBlacklist(userID, AccountID).then(function (result) {
            console.log("Function: Adding it to the blacklist.")
            console.log("Successfully added.");
            document.getElementById('add/delete response').innerHTML = "Successfully Added " + userID;
            conn.close();
        }).catch((error) => {
            conn.close();
            console.log("ERROR:\n" + error);
             document.getElementById('add/delete response').innerHTML = userID + " already exists in the Blacklist";
        });
    }

    async function AddBattletagToBlacklist(userBattleTag, userAccountID) {
        // Add to blacklist.
        var req = new sql.Request(conn);
        queryString = "INSERT INTO blacklist (BattleTag, DateAdded)\
            VALUES (@queryBattleTag, CURRENT_TIMESTAMP);";
        // Unknown Account ID
        if (userAccountID != "NULL") { 
            var queryString = "INSERT INTO blacklist (BattleTag, AccountID, DateAdded)\
            VALUES (@queryBattleTag, @queryAccountID, CURRENT_TIMESTAMP);";
            var queryAccountID = userAccountID + "";
            req.input('queryAccountID', queryAccountID);
        }
        req.input('queryBattleTag', userBattleTag);
        return new Promise((resolve, reject) => {
            req.input('queryBattleTag', userBattleTag)
                .query(queryString)
                .then(function (recordset) {
                    // If 1 row affected, then good.
                    if (recordset.rowsAffected == 1) {
                        console.log(recordset);
                        resolve(recordset);
                    } else { // not good
                        console.log(recordset);
                        reject(recordset);
                    }
                }).catch(function (err) { // some error occured
                    reject("Error in function AddBattletagToBlacklist:\n" + err);
                });
        });
    }
});

document.getElementById('delete-blacklist').addEventListener('click', () => {
    // SQL delete
    var removeUserTag = document.getElementById('input-tag').value;
    // Connect to configuration
    var conn = new sql.ConnectionPool(config)

    // list all table id
    conn.connect().then(function () {
        
        remove_from_blacklist(removeUserTag);
        
    }).catch(function(err){
        console.log(err);
        conn.close();
    });

    async function remove_from_blacklist(userID) {

        await RemoveBattleTagFromBlacklist(userID).then(function (result) {
            console.log("Function: Remove the ID from the blacklist");
            console.log("REMOVING...")
            console.log(result);
            if(result == undefined){
                console.log("Removed successfully!");
            }
        }).catch((error) => {
            conn.close();
            console.log("ERROR:\n" + error);
        });
    }

    async function QueryBlacklistForBattleTag(userBattleTag) {
        var req = new sql.Request(conn);
        queryBattleTag = userBattleTag;
        var queryString = "SELECT * FROM blacklist WHERE BattleTag = @queryBattleTag;";
        return new Promise((resolve, reject) => {
            req.input('queryBattleTag', queryBattleTag).query(queryString)
                .then(function (recordset) {
                    // not inside blacklist
                    if (recordset.rowsAffected == 0) { 
                        resolve(false);
                    } else { 
                        // inside blacklist
                        resolve(true);
                    }
                }).catch(function (err) {
                    reject(err);
                });
        });
    }

    async function RemoveBattleTagFromBlacklist(userBattleTag) {
        queryBattleTag = userBattleTag;
        queryString = "DELETE from blacklist WHERE BattleTag = @queryBattleTag;";
        QueryBlacklistForBattleTag(queryBattleTag).then(function (result) {
            if (result) {
                // person is in blacklist.
                var req = new sql.Request(conn);
                req.input('queryBattleTag', queryBattleTag)
                    .query(queryString)
                    .then(function (result) {
                        console.log("The BattleTag: " + userBattleTag + " was in the blacklist and has been removed.");
                        document.getElementById('add/delete response').innerHTML = "Successfully removed " + queryBattleTag + " from Blacklist";
                        conn.close();
                    })
                    .catch((err) => {
                        console.log(err);
                        conn.close();
                    });
            } else {
                // person is not in blacklist.
                console.log("Unable to remove BattleTag: " + userBattleTag + " as it is already not present in the blacklist.");
                document.getElementById('add/delete response').innerHTML = userBattleTag + " does not exist in the Blacklist";
            }
        }).catch(err => console.log(err));
    }
})




