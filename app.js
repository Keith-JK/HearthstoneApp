var express = require('express');
var passport = require('passport');
var util = require('util');
var path = require('path');

var cookieParser = require('cookie-parser');
var session = require('express-session');

const sql = require('mssql');

// passport strategy
var BnetStrategy = require('passport-bnet').Strategy;

// credentials 
const config = require('./config/keys');
var BNET_ID = config.Blizzard.clientID;
var BNET_SECRET = config.Blizzard.clientSecret;
const SQLkeys = config.SQLConfig;

var conn = new sql.ConnectionPool(config.SQLConfig);


passport.serializeUser(function(user, done) {
    done(null, user);
});

passport.deserializeUser(function(obj, done) {
    done(null, obj);
});

// Use the BnetStrategy within Passport.
passport.use(
  new BnetStrategy(
    { clientID: BNET_ID,
      clientSecret: BNET_SECRET,
      scope: "openid",
      callbackURL: "http://localhost:3000/auth/blizzard/redirect" },
    function(accessToken, refreshToken, profile, done) {
      process.nextTick(function () {
        return done(null, profile);
      });
    })
);

var app = express();
var id = null;
var battletag = null;

// configure Express
app.use(cookieParser());
app.use(session({ secret: 'blizzard',
                  saveUninitialized: false,
                  resave: false }));

// Initialize Passport!  Also use passport.session() middleware, to support
// persistent login sessions (recommended).
app.use(passport.initialize());
app.use(passport.session());

// rendering html
app.use(express.static(__dirname + '/bootstrap'));

app.get('/auth/bnet',
        passport.authenticate('bnet'));

app.get('/auth/blizzard/redirect',
        passport.authenticate('bnet', { failureRedirect: '/' }),
        function(req, res){
          id = req.user.id;
          battletag = req.user.battletag;
          res.redirect('/');
        });

app.get('/', function(req, res) {
  if(id !== null && battletag !== null){

    conn.connect().then(() => {
        RetrieveAccountInfo("NewMarker#123", "12389")
            .then((TrustFactor) => {
                console.log("Trust Factor: " + TrustFactor);

                // start client and send BattleTag to world server
                const ipc=require('node-ipc');

                ipc.config.id = 'hello';
                ipc.config.retry = 1000;

                ipc.connectTo(
                    'world',
                    function(){
                        ipc.of.world.on(
                            'connect',
                            function(){
                                ipc.log('## connected to world ##', ipc.config.delay);
                                ipc.of.world.emit(
                                    'battletag',
                                    {
                                        id      : ipc.config.id,
                                        message : battletag
                                    }
                                );
                                ipc.of.world.emit(
                                    'trustFactor',
                                    {
                                        id      : ipc.config.id,
                                        message : TrustFactor
                                    }
                                );
                            }
                        );
                        // world server crash
                        ipc.of.world.on(
                            'disconnect',
                            function(){
                                ipc.log('disconnected from world');
                            }
                        );
                        // received message from world of event id 'app.message'
                        ipc.of.world.on(
                            'app.message',
                            function(data){
                                ipc.log('got a message from world, BattleTag : ', data);
                            }
                        );
                        // when client closes, send event to world
                        console.log(ipc.of.world.destroy);
                    }
                );
            })
            .catch((err) => console.log("Test Failed: \n" + err));
    }).catch(err => console.log(err));

    
    // run html views
    res.sendFile(path.join(__dirname + '/bootstrap/redirect.html'));
    
  }else{
    res.sendFile(path.join(__dirname + '/bootstrap/oauth.html'));
  }
});

// bugged feature -- scrapped
app.get('/logout', function(req, res) {
  // this should log me out but its not
  req.logout();
  req.session.destroy();
  req.session = null;
});

var server = app.listen(3000, function() {
  console.log('Listening on port %d', server.address().port);
});

// SQL functions
async function RetrieveAccountInfo(battleTag, accountID) {
    const isPresent_accountID = await CheckUsersTableAccountID(accountID)
        .catch((err) => console.log(err));
    if (isPresent_accountID) {
        console.log("User ID present in database");
        // left-side flow
        const isPresent_BattleTag = await CheckUsersTableBattleTag(battleTag)
            .catch((err) => console.log(err));
        if (!isPresent_BattleTag) {
            console.log("Updating Battletag");
            await UpdateUserBattleTag(battleTag, accountID)
                .catch((err) => console.log(err));
        }
    } else {
        console.log("Adding new user");
        // right-side flow
        await AddUserIntoTable(battleTag, accountID)
            .catch((err) => console.log(err));
    }
    console.log("Getting trust factor");
    const trustFactor = await getTrustFactor(accountID)
        .catch((err) => console.log(err));
    conn.close();
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