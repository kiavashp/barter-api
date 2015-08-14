var config = require(__dirname +'/lib/node_modules/config');
var r = require('rethinkdb');

config.projectRoot = __dirname;

r.connection = null;

r.connect(config.rethinkdb, function (err, conn) {

    if (err) {
        throw err;
    }

    r.connection = conn;

    require(config.projectRoot +'/lib/index.js');

});
