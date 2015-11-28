var config = require('config');
var log = require('log');

var routes;

var r = require('rethinkdb');

var Auth = require('auth');
var Hapi = require('hapi');
var server = new Hapi.Server({});

server.connection({ port: config.http.port });

server.register(Auth, function (err) {
    server.auth.strategy('simple', 'simple');
});

r.connection = null;
r.isNoResults = function (err) {
    return err.name === "ReqlDriverError" &&
        err.message === "No more rows in the cursor.";
};

function init(callback) {

    r.connect(config.rethinkdb).then(function (conn) {

        r.connection = conn;

        routes = require(__dirname +'/routes.js');

        routes.register(server);

        if (typeof callback === 'function') {
            callback();
        }

    });

}

function start() {

    server.start(function (err) {

        if (err) {
            throw err;
        }

        log.info('server running at '+ server.info.uri);

    });

}

exports.server = server;
exports.init = init;
exports.start = start;