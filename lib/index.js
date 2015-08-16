var config = require('config');
var log = require('log');

var routes = require(__dirname +'/routes.js');

var Auth = require('auth');
var Hapi = require('hapi');
var server = new Hapi.Server({});

server.connection({ port: config.http.port });

server.register(Auth, function (err) {
    server.auth.strategy('simple', 'simple');
});

routes.register(server);

server.start(function (err) {

    if (err) {
        throw err;
    }

    log.info('server running at '+ server.info.uri);

});
