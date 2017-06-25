const request = require('request');
const logger  = require('bole')('stathat');
const config  = require('./config');

const key = config('stathat').key;

if (!key) {
	logger.warn('StatHat disabled because of missing key');
}

function count(stat, count = 1, callback) {
	if (!key) {
		return;
	}
	
	let options = {
		timeout: 10000,
		url: 'http://api.stathat.com/ez',
		form: {
			ezkey: key,
			stat: stat,
			count: count
		},
		method: 'POST'
	};
	
	request(options, (err, res, body) => {
		if (err) {
			logger.warn('StatHat response error', err);
		}
		else if (res.statusCode != 200 && res.statusCode != 204) {
			logger.warn({ body }, 'StatHat response code:', res.statusCode);
		}
		
		callback && callback();
	});
}

module.exports.count = count;
