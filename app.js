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
const config = require('./config/keys')
var BNET_ID = config.Blizzard.clientID;
var BNET_SECRET = config.Blizzard.clientSecret;
const SQLkeys = config.SQLConfig;


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
                        'app.message',
                        {
                            id      : ipc.config.id,
                            message : battletag
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


function createNewUser(){
  // SQL add 
  var addUserTag = battletag;
  var trust_level = 0;

  // Connect to configuration
  var conn = new sql.ConnectionPool(SQLkeys);
  
  // connection
  conn.connect().then(function () {

      add_to_users(addUserTag, addAccountID);
      
  }).catch(function(err){
      console.log(err);
      conn.close();
      // problem connecting
      console.log("err connecting");
      
  });

  async function add_to_users(userID, AccountID) {
      await AddBattletagToBlacklist(userID, AccountID).then(function (result) {
          console.log("Function: Adding it to the blacklist.")
          console.log("Successfully added.");
          conn.close();
          
      }).catch((error) => {
          conn.close();
          console.log("ERROR:\n" + error + "\n already in database");
          
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
}