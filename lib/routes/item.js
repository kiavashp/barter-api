var config = require('config');
var log = require('log');

var r = require('rethinkdb');

var Boom = require('boom');
var Joi = require('joi');

function register(fields, handlers, routes) {

    handlers['item'] = {};

    handlers['item'].read = function read(request, reply) {

        var query;

        query = r.table('item');

        if (request.params.id) {
            query = query.get(request.params.id);
        } else {
            query = query.limit(100);
        }

        query.run(r.connection).then(function (cursor) {

            if (!cursor) {
                return reply(Boom.notFound());
            }

            if (request.params.id) {

                reply( cursor )
                    .type('application/json');

            } else {

                cursor.toArray().then(function (result) {

                    reply( result )
                        .type('application/json');

                    cursor.close();

                }).catch(function (err) {

                    log.error(err.stack);

                    reply(Boom.badImplementation());

                    cursor.close();

                });

            }

        }).catch(function (err) {

            log.error(err.stack);

            reply(Boom.badImplementation());

        });

    };

    routes.push({
        method: 'GET',
        path: '/item',
        handler: handlers['item'].read
    });

    routes.push({
        method: 'GET',
        path: '/item/{id}',
        handler: handlers['item'].read,
        config: {
            auth: 'simple',
            validate: {
                params: {
                    id: fields['uuid']
                }
            }
        }
    });

}

exports.register = register;
