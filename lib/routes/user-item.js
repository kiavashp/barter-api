var config = require('config');
var log = require('log');

var r = require('rethinkdb');

var Boom = require('boom');
var Joi = require('joi');

function register(fields, handlers, routes) {

    handlers['user-item'] = {};

    handlers['user-item'].create = function create(request, reply) {

        console.log('payload:', request.payload);

        var query;
        var userItem = {
            id: request.params.itemid,
            count: request.payload.count
        };

        query = r.table('user').get(request.params.userid).update({
            items: r.branch(
                r.row.hasFields('items'),
                r.row('items').setInsert(userItem),
                [userItem]
            )
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

        query = r.table('user').getAll(request.params.userid)
            .concatMap(function (user) {
                return r.branch( user.hasFields('items'), user('items'), [] );
            });

        query = query.eqJoin('id', r.table('item')).zip();

        if (request.params.itemid) {
            query = query.filter({ id: request.params.itemid });
        } else {
            query = query.limit(100);
        }

        query.run(r.connection).then(function (cursor) {

            if (!cursor) {
                return reply(Boom.notFound());
            }

            cursor.toArray().then(function (result) {

                console.log('result:', result);

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
        var itemUpdate = {
            id: request.params.itemid,
            count: request.payload.count
        };

        query = r.table('user').get(request.params.userid)
            .update({
                items: r.branch(
                    r.row.hasFields('items').not(),
                    [itemUpdate],
                    r.row('items').filter({id: itemUpdate.id}).merge(itemUpdate)
                )
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

        query = r.table('user').getAll(request.params.userid)
            .filter(r.row.hasFields('items'))('items')
            .filter({ id: request.params.itemid })
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
                    count: fields['number.positive'].default(1)
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
                    count: fields['number.positive']
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
