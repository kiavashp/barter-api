var yargs = require('yargs');
var config = require(__dirname +'/lib/node_modules/config');

config.projectRoot = __dirname;
config.dependenciesRoot = config.projectRoot +'/lib/node_modules';

var barter = require(config.projectRoot +'/lib/index.js');

module.exports = barter;

if (require.main === module) {
    yargs.version(function () {
        return require(__dirname + '/package.json').version;
    }).alias('version', 'v').argv;

    barter.init(function () {
        barter.start();
    });
}
