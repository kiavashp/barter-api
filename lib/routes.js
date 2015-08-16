var config = require('config');
var log = require('log');

var fs = require('fs');

var r = require('rethinkdb');
var connection = r.connection;

var Boom = require('boom');
var Joi = require('joi');

var fields = {};
var routes = [];
var handlers = {};

function register(server) {

    server.route(routes);

}

exports.register = register;

// fields
fields['uuid'] = Joi.string().length(36);
fields['text.small'] = Joi.string().min(1).max(30);

// routes

// routes.root
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

// routes.session
handlers['session'] = {};

handlers['session'].create = function create(request, reply) {

    var now = Date.now().toString();
    var query;

    query = r.db('barter').table('user')
        .filter(request.payload).limit(1)
        .update({ token: r.uuid() }, { nonAtomic: true, returnChanges: true });

    query.run(connection).then(function (result) {

        var token;

        if (!result || !result.replaced || !result.changes) {
            return reply(Boom.badRequest('invalid credentials'));
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

    query = r.db('barter').table('user')
        .getAll(token, { index: 'token' })
        .pluck('id', 'username')
        .limit(1);

    query.run(connection).then(function (cursor) {

        return cursor.next().then(function (result) {

            reply(result)
                .location('/session/'+ result.token);

        });

    }).catch(function (err) {

        log.error(err.stack);

        reply(Boom.badImplementation());

    });

};

handlers['session'].update = function update(request, reply) {

    reply().code(204);

};

handlers['session'].remove = function remove(request, reply) {

    var token = request.auth.credentials.token;
    var query;

    query = r.db('barter').table('user')
        .getAll(token, { index: 'token' }).limit(1)
        .update({ token: null });

    query.run(connection).then(function (result) {

        reply();

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

// routes.user
handlers['user'] = {};

handlers['user'].create = function create(request, reply) {

    var query;

    request.payload.token = null;

    query = r.db('barter').table('user')
        .insert(request.payload);

    query.run(connection).then(function (cursor) {

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

    query = r.db('barter').table('user');

    if (request.params.id) {
        query = query.get(request.params.id);
    } else {
        query = query.limit(100);
    }

    query = query.pluck('id', 'username');

    query.run(connection).then(function (cursor) {

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

handlers['user'].update = function update(request, reply) {

    var query;

    if (request.params.id != request.credentials.id) {
        return reply(Boom.forbidden());
    }

    query = r.db('barter').table('user')
        .get(request.params.id)
        .update(request.payload);

    query.run(connection).then(function (result) {

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

    query = r.db('barter').table('user')
        .get(request.params.id)
        .delete();

    query.run(connection).then(function (cursor) {

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
