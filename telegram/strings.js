const strings = require('./strings.json');

function get(key) {
	var value = strings[key] || '';
	
	if (Array.isArray(value)) {
		// Deep clone Array
		return value.slice();
	}
	
	return value;
}

module.exports.get = get;
