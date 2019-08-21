const sql = require('mssql');
const config = require('./config/keys');
var conn = new sql.ConnectionPool(config.SQLConfig);

conn.connect().then(() => {
    RetrieveAccountInfo("NewMarker#1234", "12389")
        .then((TrustFactor) => console.log("Trust Factor: " + TrustFactor))
        .catch((err) => console.log("Test Failed: \n" + err));

    // Run the delete function by itself. It messes up the RetrieveAccountInfo function if you use .then
    /*
    DeleteUserFromTable("12389")
        .then((isSuccessful) => {
            if (isSuccessful) {
                console.log("Delete Successful.");
            } else {
                console.log("Delete Unsuccessful.");
            }
        })
        .catch ((err) => console.log("Test Failed: \n" + err));
        */
   
}).catch(err => console.log(err));

async function RetrieveAccountInfo(battleTag, accountID) {
    const isPresent_accountID = await CheckUsersTableAccountID(accountID)
        .catch((err) => console.log(err));
    if (isPresent_accountID) {
        // left-side flow
        const isPresent_BattleTag = await CheckUsersTableBattleTag(battleTag)
            .catch((err) => console.log(err));
        if (!isPresent_BattleTag) {
            await UpdateUserBattleTag(battleTag, accountID)
                .catch((err) => console.log(err));
        }
    } else {
        // right-side flow
        await AddUserIntoTable(battleTag, accountID)
            .catch((err) => console.log(err));
    }
    const trustFactor = await getTrustFactor(accountID)
        .catch((err) => console.log(err));
    return trustFactor;
}

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
                reject("Error in CheckUsersTableAccountID function: \n" + err);
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
    const isAlreadyInTable = await CheckUsersTableBattleTag(battleTag);
    if (isAlreadyInTable) {
        return false;
    }
    var req = new sql.Request(conn);
    queryString = "INSERT INTO users(BattleTag, AccountID, TrustFactor) VALUES(\
        @battleTag, @accountID, 0);";
    return new Promise((resolve, reject) => {
        req.input('battleTag', battleTag)
            .input('accountID', accountID)
            .query(queryString)
            .then(function (recordset) {
                if (recordset.rowsAffected == 1) {
                    resolve(recordset);
                } else { // not good
                    reject(recordset);
                }
            }).catch(function (err) { // some error occured
                reject("Error in function AddUserIntoTable:\n" + err);
            });
    });
}

async function getTrustFactor(accountID) {
    var req = new sql.Request(conn);
    var queryString = "SELECT * FROM users WHERE AccountID = @queryAccountID;";
    return new Promise((resolve, reject) => {
        req.input('queryAccountID', accountID).query(queryString)
            .then(function (recordset) {
                if (recordset.rowsAffected[0] === 1) {
                    const trustFactor = ((recordset.recordset)[0]).TrustFactor;
                    resolve(trustFactor);
                } else {
                    reject("Error in getTrustFactor function: \n" + recordset);
                }
            }).catch((err) => console.log(err));
    });
}

async function DeleteUserFromTable(accountID) {
    const isAlreadyInTable = await CheckUsersTableAccountID(accountID);
    if (!isAlreadyInTable) {
        console.log("User not found.");
    } else {
        var req = new sql.Request(conn);
        var queryString = "DELETE FROM users WHERE AccountID = @queryAccountID;";
        return new Promise((resolve, reject) => {
            req.input('queryAccountID', accountID).query(queryString)
                .then(function (recordset) {
                    if (recordset.rowsAffected[0] === 1) {
                        resolve(true);
                    } else {
                        reject("Error in DeleteUserFromTable function: \n" + recordset);
                    }
                }).catch((err) => console.log(err));
        });
    }
}