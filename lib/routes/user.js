var config = require('config');
var log = require('log');

var r = require('rethinkdb');

var Boom = require('boom');
var Joi = require('joi');

function register(fields, handlers, routes) {

    handlers['user'] = {};

    handlers['user'].create = function create(request, reply) {

        var query;

        request.payload.token = null;

        query = r.table('user')
            .insert(request.payload);

        query.run(r.connection).then(function (cursor) {

            reply()
                .created('/user/'+ cursor.generated_keys[0])
                .type('application/json');

        }).catch(function (err) {

            log.error(err.stack);

            reply(Boom.badImplementation());

        });

    };

    handlers['user'].read = function read(request, reply) {

        var query;

        query = r.table('user');

        if (request.params.id) {
            query = query.getAll(request.params.id);
        } else {
            query = query.limit(100);
        }

        query = query.without({ password: true, token: true });
        query = query.merge(function (u) {
          return { items: r.db('barter').table('user').getAll(u('id'))
            .filter(u => u.hasFields('items'))
            .concatMap(u => u('items'))
            .eqJoin('id', r.db('barter').table("item"))
            .zip()
            .coerceTo('array') }
        });

        query.run(r.connection).then(function (cursor) {

            if (!cursor) {
                return reply(Boom.notFound());
            }

            cursor.toArray().then(function (result) {

                if (request.params.id) {
                    result = result[0];
                }

                reply( result )
                    .type('application/json');

                cursor.close();

            }).catch(function (err) {

                log.error(err.stack);

                reply(Boom.badImplementation());

                cursor.close();

            });

        }).catch(function (err) {

            log.error(err.stack);

            reply(Boom.badImplementation());

        });

    };

    handlers['user'].update = function update(request, reply) {

        var query;

        if (request.params.id != request.credentials.id) {
            return reply(Boom.forbidden());
        }

        query = r.table('user')
            .get(request.params.id)
            .update(request.payload);

        query.run(r.connection).then(function (result) {

            reply()
                .location('/user/'+ request.params.id);

        }).catch(function (err) {

            log.error(err.stack);

            reply(Boom.badImplementation());

        });

    };

    handlers['user'].remove = function remove(request, reply) {

        var query;

        if (request.params.id != request.credentials.id) {
            return reply(Boom.forbidden());
        }

        query = r.table('user')
            .get(request.params.id)
            .delete();

        query.run(r.connection).then(function (cursor) {

            reply();

        }).catch(function (err) {

            log.error(err.stack);

            reply(Boom.badImplementation());

        });

    };

    routes.push({
        method: 'POST',
        path: '/user',
        handler: handlers['user'].create,
        config: {
            validate: {
                payload: {
                    username: fields['text.small'].required(),
                    password: fields['text.small'].required()
                }
            }
        }
    });

    routes.push({
        method: 'GET',
        path: '/user',
        handler: handlers['user'].read,
        config: {
            auth: 'simple'
        }
    });

    routes.push({
        method: 'GET',
        path: '/user/{id}',
        handler: handlers['user'].read,
        config: {
            auth: 'simple',
            validate: {
                params: {
                    id: fields['uuid']
                }
            }
        }
    });

    routes.push({
        method: 'PUT',
        path: '/user/{id}',
        handler: handlers['user'].update,
        config: {
            auth: 'simple',
            validate: {
                params: {
                    id: fields['uuid']
                },
                payload: {
                    username: fields['text.small'],
                    password: fields['text.small']
                }
            }
        }
    });

    routes.push({
        method: 'DELETE',
        path: '/user/{id}',
        handler: handlers['user'].remove,
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
