const Handlebars = require('handlebars');
const strings    = require('./strings.js');

function compile(key, data) {
	const template = Handlebars.compile(strings.get(key), { noEscape: true });
	return template(data);
}

module.exports = compile;
