const Handlebars = require('handlebars');
const emoji      = require('node-emoji');
const strings    = require('./strings.js');

function compile(key, data) {
	let template = Handlebars.compile(strings.get(key), { noEscape: true });
	let compiled = template(data);
	return emoji.emojify(compiled);
}

module.exports = compile;
