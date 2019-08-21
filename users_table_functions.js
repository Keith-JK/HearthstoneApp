const sql = require('mssql');
const config = require('./config/keys');
var conn = new sql.ConnectionPool(config.SQLConfig);

// Checks if the user's account ID already exists in the users table and returns true or false.
async function CheckUsersTableAccountID(accountID) {
    var req = new sql.Request(conn);
    var queryAccountID = accountID;
    var queryString = "SELECT * FROM users WHERE AccountID = @queryAccountID;";
    return new Promise((resolve, reject) => {
        req.input('queryAccountID', queryAccountID).query(queryString)
            .then(function (recordset) {
                if (recordset.rowsAffected == 0) {
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

// Checks if the user's BattleTag already exists in the users table and returns true or false.
async function CheckUsersTableBattleTag(battleTag) {
    var req = new sql.Request(conn);
    var queryBattleTag = battleTag;
    var queryString = "SELECT * FROM users WHERE BattleTag = @queryBattleTag;";
    return new Promise((resolve, reject) => {
        req.input('queryBattleTag', queryBattleTag).query(queryString)
            .then(function (recordset) {
                if (recordset.rowsAffected == 0) {
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

// Update the user's BattleTag (if the user changed their BattleTag), and should return true.
async function UpdateUserBattleTag(newBattleTag, accountID) {
    var req = new sql.Request(conn);
    var queryString = "UPDATE users\
                            SET BattleTag = @queryBattleTag\
                            WHERE AccountID = @queryAccountID;";
    return new Promise((resolve, reject) => {
        req.input('queryBattleTag', newBattleTag)
            .input('queryAccountID', accountID)
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


// Adds new user into the users table with trust factor of 0.
async function AddUserIntoTable(battleTag, accountID) {
    CheckUsersTableAccountID(accountID).then((isPresent) => {
        if (!isPresent) {
            var req = new sql.Request(conn);
            queryString = "INSERT INTO users(BattleTag, AccountID, TrustFactor) VALUES(\
                @battleTag, @accountID, 0);";
            return new Promise((resolve, reject) => {
                req.input('battleTag', battleTag)
                    .input('accountID', accountID)
                    .query(queryString)
                    .then(function (recordset) {
                        if (recordset.rowsAffected == 1) {
                            console.log(recordset);
                            resolve(recordset);
                        } else { // not good
                            console.log(recordset);
                            reject(recordset);
                        }
                    }).catch(function (err) { // some error occured
                        reject("Error in function AddUserIntoTable:\n" + err);
                    });
            })
        } else {
            console.log("User already present in table.");
        }
    })
}

async function getTrustFactor(accountID) {
    var req = new sql.Request(conn);
    var queryString = "SELECT * FROM users WHERE BattleTag = @queryAccountID;";
    return new Promise((resolve, reject) => {
        req.input('queryAccountID', accountID).query(queryString)
            .then(function (recordset) {
                if (recordset.rowsAffected == 0) {
                    reject("Error in getTrustFactor function: \n" + recordset);
                } else {
                    const trustFactor = ((recordset.recordset)[0]).TrustFactor;
                    resolve(trustFactor);
                }
            }).catch((err) => console.log(err));
    });
}