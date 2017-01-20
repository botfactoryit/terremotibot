const Handlebars = require('handlebars');
const emoji      = require('node-emoji');
const strings    = require('./strings.js');
const helper     = require('../helper.js');

// Register the 'time' handlebars helper,
// which converts Date objects into pretty time representations
Handlebars.registerHelper('time', helper.dateToPrettyTime);
Handlebars.registerHelper('bool', helper.boolToEnabled);

function compile(key, data) {
	let template = Handlebars.compile(strings.get(key), { noEscape: true });
	let compiled = template(data);
	return emoji.emojify(compiled);
}

module.exports = compile;
