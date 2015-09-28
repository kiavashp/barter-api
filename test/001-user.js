require('should');

var path = require('path');
var barter = require(path.resolve(__dirname, '../'));

var server = barter.server;
var config = barter.config;

var Lab = require('lab');
var lab = exports.lab = Lab.script();
var suite = lab.suite;
var test = lab.test;
var expect = Lab.expect;

var testData = {
    userOne: {
        username: 'Test1',
        password: 'Pass1'
    }
};

test('init server', function (done) {

    barter.init(done);

})

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
