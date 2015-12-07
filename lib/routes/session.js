var config = require('config');
var log = require('log');

var r = require('rethinkdb');

var Boom = require('boom');
var Joi = require('joi');

function register(fields, handlers, routes) {

    handlers['session'] = {};

    handlers['session'].create = function create(request, reply) {

        var now = Date.now().toString();
        var query;

        log.trace('session.create');

        query = r.table('user')
            .filter(request.payload).limit(1)
            .update({ token: r.uuid() }, { nonAtomic: true, returnChanges: true });

        query.run(r.connection).then(function (result) {

            var token;

            log.debug(result);

            if (!result || !result.replaced || !result.changes) {
                log.debug('request.payload', request.payload);
                return reply(Boom.unauthorized('invalid username or password'));
            }

            token = result.changes[0].new_val.token;

            reply({ token: token })
                .type('application/json');

        }).catch(function (err) {

            log.error(err.stack);

            reply(Boom.badImplementation());

        });

    };

    handlers['session'].read = function read(request, reply) {

        var token = request.auth.credentials.token;
        var query;

        query = r.table('user')
            .getAll(token, { index: 'token' })
            .pluck('id', 'username')
            .limit(1);

        query.run(r.connection).then(function (cursor) {

            return cursor.next().then(function (result) {

                reply(result)
                    .location('/session/'+ result.token);

                cursor.close();

            });

        }).catch(function (err) {

            if (!r.isNoResults(err)) {
                log.error(err.stack);
            }

            reply(Boom.badImplementation());

        });

    };

    handlers['session'].update = function update(request, reply) {

        reply().code(204);

    };

    handlers['session'].remove = function remove(request, reply) {

        var token = request.auth.credentials.token;
        var query;

        query = r.table('user')
            .getAll(token, { index: 'token' }).limit(1)
            .update({ token: null });

        query.run(r.connection).then(function (result) {

            reply().code(204);

        }).catch(function (err) {

            log.error(err.stack);

            reply(Boom.badImplementation());

        });

    };

    routes.push({
        method: 'POST',
        path: '/session',
        handler: handlers['session'].create,
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
        path: '/session',
        handler: handlers['session'].read,
        config: {
            auth: 'simple'
        }
    });

    routes.push({
        method: 'PUT',
        path: '/session',
        handler: handlers['session'].update,
        config: {
            auth: 'simple'
        }
    });

    routes.push({
        method: 'DELETE',
        path: '/session',
        handler: handlers['session'].remove,
        config: {
            auth: 'simple'
        }
    });

}

exports.register = register;
