var config = require('config');
var log = require('log');

var r = require('rethinkdb');

var Boom = require('boom');
var Joi = require('joi');

var fields = {};
var routes = [];
var handlers = {};

function route(path) {
    return require(__dirname + '/' + path).register(fields, handlers, routes);
}

function register(server) {
    server.route(routes);
}

// fields
fields['uuid'] = Joi.string().length(36);
fields['text.small'] = Joi.string().min(1).max(30);
fields['number.positive'] = Joi.number().positive();

route('root');
route('session');
route('user');
route('item');
route('user-item');

exports.register = register;
