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
        var query = r.tableCreate(options.name)
            .run(r.connection);

        if (Array.isArray(options.indexes)) {
            options.indexes.forEach(function (i) {
                query = query.then(function () {
                    return r.table(options.name).indexCreate(i).run(r.connection);
                });
            });
        }

        query = query.then(function () {
            done();
        }).catch(function (e) {
            console.log(e.msg);
            done();
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
        indexes: ['name']
    }));

    test('create table: item', { timeout: 10e3 }, createTable({
        name: 'item',
        indexes: ['name']
    }));

});

suite('test data', function () {

    test('user', fillTable({
        table: 'user'
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

            response.statusCode.should.equal(201);
            response.headers.should.have.property('location');
            response.headers.location.should.be.String();
            response.should.have.property('result').equal(null);

            testData.userOne.url = response.headers.location;

            done();

        });

    });

});

exports.lab = lab;
