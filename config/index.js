const fs = require('fs');

var content = fs.readFileSync(__dirname + '/config.json').toString();
var config = JSON.parse(content);

module.exports = function(module) {
	return config[module] || {};
};
