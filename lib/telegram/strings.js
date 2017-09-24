const strings = require('./strings.json');

function get(key) {
	let value = strings[key] || '';
	
	if (Array.isArray(value)) {
		// Deep clone Array
		return value.slice();
	}
	
	return value;
}

module.exports.get = get;
