var config = require('config');
var log = require('log');

var r = require('rethinkdb');

var Boom = require('boom');
var Joi = require('joi');

function register(fields, handlers, routes) {

    handlers['user-item'] = {};

    handlers['user-item'].create = function create(request, reply) {

        var query;

        query = r.table('userItem').insert({
            userid: request.params.userid,
            itemid: request.params.itemid,
            count: request.payload.count
        });

        query.run(r.connection).then(function (cursor) {

            reply()
                .created('/user/' + request.params.userid + '/item/' + request.params.itemid);

        }).catch(function (err) {

            log.error(err.stack);

            reply(Boom.badImplementation());

        });

    };

    handlers['user-item'].read = function read(request, reply) {

        var query;

        query = r.table('userItem').getAll(request.params.userid, {index: 'userid'})
            .eqJoin('itemid', r.table('item'))
            .zip()
            .without({userid: true, itemid: true});

        if (request.params.itemid) {
            query = query.filter({id: request.params.itemid});
        } else {
            query = query.limit(100);
        }

        query.run(r.connection).then(function (cursor) {

            if (!cursor) {
                return reply(Boom.notFound());
            }

            cursor.toArray().then(function (result) {

                if (request.params.itemid) {
                    result = result[0];
                }

                reply( result )
                    .type('application/json');

                cursor.close();

            });

        }).catch(function (err) {

            log.error(err.stack);

            reply(Boom.badImplementation());

        });

    };

    handlers['user-item'].update = function update(request, reply) {

        var query;

        query = r.table('userItem').getAll(request.params.userid, {index: 'userid'})
            .filter({itemid: request.params.itemid})
            .update({
                count: r.row('count').add(request.payload.increment)
            });

        query.run(r.connection).then(function (result) {

            reply()
                .location('/user/' + request.params.userid + '/item/' + request.params.itemid);

        }).catch(function (err) {

            log.error(err.stack);

            reply(Boom.badImplementation());

        });

    };

    handlers['user-item'].remove = function remove(request, reply) {

        var query;

        query = r.table('userItem').getAll(request.params.userid, {index: 'userid'})
            .filter({itemid: request.params.itemid})
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
        path: '/user/{userid}/item/{itemid}',
        handler: handlers['user-item'].create,
        config: {
            validate: {
                params: {
                    userid: fields['uuid'],
                    itemid: fields['uuid']
                },
                payload: {
                    count: fields['number.integer.positive'].default(1)
                }
            }
        }
    });

    routes.push({
        method: 'GET',
        path: '/user/{userid}/item',
        handler: handlers['user-item'].read,
        config: {
            auth: 'simple',
            validate: {
                params: {
                    userid: fields['uuid']
                }
            }
        }
    });

    routes.push({
        method: 'GET',
        path: '/user/{userid}/item/{itemid}',
        handler: handlers['user-item'].read,
        config: {
            auth: 'simple',
            validate: {
                params: {
                    userid: fields['uuid'],
                    itemid: fields['uuid']
                }
            }
        }
    });

    routes.push({
        method: 'PUT',
        path: '/user/{userid}/item/{itemid}',
        handler: handlers['user-item'].update,
        config: {
            auth: 'simple',
            validate: {
                params: {
                    userid: fields['uuid'],
                    itemid: fields['uuid']
                },
                payload: {
                    increment: fields['number.integer']
                }
            }
        }
    });

    routes.push({
        method: 'DELETE',
        path: '/user/{userid}/item/{itemid}',
        handler: handlers['user-item'].remove,
        config: {
            auth: 'simple',
            validate: {
                params: {
                    userid: fields['uuid'],
                    itemid: fields['uuid']
                }
            }
        }
    });

}

exports.register = register;
