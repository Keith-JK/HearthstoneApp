// use require(./config/keys) to use 
module.exports = {
    Blizzard: {
        clientID: 'eee3716d5cc34c5ab9e050874776e5c8',
        clientSecret: 'HQMzt5rs9WhR9NIOgH2wlI70eqox5m2J',
        authorizationUrl: 'https://us.battle.net/oauth/authorize',
        tokenURL: 'https://us.battle.net/oauth/token',
        redirectUri: 'http://localhost/'
    },
    SQLConfig: {
        server	:'rexxarmeetsjaina.database.windows.net',
        user	:'rexxarmeetsjaina',
        password:'Keithyboy123', 
        database:'RMJ_Main',
        options :{
            encrypt : true
        }
    }
};