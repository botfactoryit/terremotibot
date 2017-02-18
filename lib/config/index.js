const fs = require('fs');

let content = fs.readFileSync(__dirname + '/config.json').toString();
const config = JSON.parse(content);

module.exports = function(module) {
	return config[module] || {};
};
