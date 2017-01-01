const request = require('request');
const logger  = require('bole')('botan');
const config  = require('../config');

const token = config('botan').token;

if (!token) {
	logger.warn('Botan disabled because of missing token');
}

function log(payload, event) {
	if (!token) {
		return;
	}
	
	var url = 'https://api.botan.io/track?token=' + token + '&uid=' + payload['from']['id'] + '&name=' + event;
	
	var options = {
		method: 'POST',
		url: url,
		body: payload,
		json: true,
		timeout: 5000
	};
	
	request(options, (err, res, body) => {
		// Ignore network errors,
		// log only Bad Request
		if (!err && res.statusCode == 400) {
			logger.error({ code: res.statusCode, req: options });
		}
	});
}

module.exports.log = log;
