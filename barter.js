var config = require(__dirname +'/lib/node_modules/config');

config.projectRoot = __dirname;
config.dependenciesRoot = config.projectRoot +'/lib/node_modules';

var log = require(config.dependenciesRoot +'/log');
var r = require('rethinkdb');

r.connection = null;

r.connect(config.rethinkdb).then(function (conn) {

    r.connection = conn;

    start();

});

function start() {

    require(config.projectRoot +'/lib/index.js');

}
