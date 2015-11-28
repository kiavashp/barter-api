var config = require('config');
var log = require('log');

var r = require('rethinkdb');

var Boom = require('boom');
var Joi = require('joi');

function register(fields, handlers, routes) {

    handlers['root'] = {};

    handlers['root'].read = function read(request, reply) {

        reply({
            'session': '/session',
            'user': '/user'
        })
        .type('application/json');

    };

    routes.push({
        method: 'GET',
        path: '/',
        handler: handlers['root'].read
    });

}

exports.register = register;
