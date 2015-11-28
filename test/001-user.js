require('should');

var path = require('path');
var barter = require(path.resolve(__dirname, '../'));

var r = barter.rethinkdb;
var server = barter.server;
var config = barter.config;

var Lab = require('lab');
var lab = Lab.script();
var suite = lab.suite;
var test = lab.test;
var expect = Lab.expect;

var testData = {
    userOne: {
        username: 'Test1',
        password: 'Pass1'
    },
    users: [
        {
            username: 'k',
            password: 'p'
        },
        {
            username: 's',
            password: 'p'
        }
    ],
    items: [
        { name:  "paper clip" },
        { name:  "paper" },
        { name:  "pen" },
        { name:  "eraser" },
        { name:  "pencil" },
        { name:  "sand dollar" }
    ]
};

function createTable(options) {
    return function (done) {
        var query = r.tableDrop(options.name)
            .run(r.connection)
            .catch(function (e) {
                console.log(e.msg);
                return Promise.resolve();
            })
            .then(function () {
                return r.tableCreate(options.name)
                    .run(r.connection);
            }).then(function () {

                var promise = Promise.resolve();

                if (Array.isArray(options.indexes)) {
                    options.indexes.forEach(function (i) {
                        promise = promise.then(function () {
                            return r.table(options.name).indexCreate(i).run(r.connection);
                        });
                    });
                }

                promise = promise.then(function () {
                    done();
                }).catch(function (e) {
                    console.log(e.msg);
                    done();
                });

            });
    };
}

function fillTable(options) {
    return function (done) {
        var query =  r.table(options.table).delete()
            .run(r.connection);

        if (options.data) {
            query = query.then(function () {
                return r.table(options.table).insert(options.data)
                    .run(r.connection);
            });
        }

        query.then(function () {
            done();
        })
        .catch(done);
    }
}

suite('setup', function () {

    test('init server', function (done) {

        barter.init(done);

    });

    test('create database', { timeout: 10e3 }, function (done) {

        r.dbCreate(config.rethinkdb.db).run(r.connection).then(function () {
            done();
        }).catch(function (e) {
            console.log(e.msg);
            done();
        });

    });

    test('create table: user', { timeout: 10e3 }, createTable({
        name: 'user',
        indexes: ['token']
    }));

    test('create table: item', { timeout: 10e3 }, createTable({
        name: 'item',
        indexes: ['name']
    }));

});

suite('test data', function () {

    test('user', fillTable({
        table: 'user',
        data: testData.users
    }));

    test('item', fillTable({
        table: 'item',
        data: testData.items
    }));

});

suite('user', function () {

    test('create', function (done) {

        server.inject({
            method: 'POST',
            url: '/user',
            payload: testData.userOne
        }, function (response) {

            response.statusCode.should.exactly(201);
            response.headers.should.Object();
            response.headers.should.property('location').String();
            response.should.property('result').equal(null);

            testData.userOne.url = response.headers.location;

            done();

        });

    });

    test('login', function (done) {

        server.inject({
            method: 'POST',
            url: '/session',
            payload: {
                username: testData.userOne.username,
                password: testData.userOne.password
            }
        }, function (response) {

            response.statusCode.should.exactly(200);
            response.headers.should.Object();
            response.should.property('result').Object();
            response.result.should.property('token').String();

            testData.userOne.token = response.result.token;

            done();

        });

    });

    test('update', function (done) {

        server.inject({
            method: 'PUT',
            url: testData.userOne.url,
            headers: {
                token: testData.userOne.token
            },
            payload: {
                username: 'Test1Updated'
            }
        }, function (response) {

            response.statusCode.should.equal(200);
            response.headers.should.Object();
            response.headers.should.property('location').String();
            response.should.property('result').equal(null);

            done();

        });

    });

    test('read', function (done) {

        server.inject({
            method: 'GET',
            url: testData.userOne.url,
            headers: {
                token: testData.userOne.token
            }
        }, function (response) {

            response.statusCode.should.equal(200);
            response.headers.should.Object();
            response.should.property('result').Object();
            response.result.should.property('id').String();
            response.result.should.property('username').String().exactly('Test1Updated');
            response.result.should.property('items').Array().lengthOf(0);

            done();

        });

    });

});

exports.lab = lab;
