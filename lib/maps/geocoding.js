const logger  = require('bole')('maps');
const request = require('request');
const config  = require('../config');
const stathat = require('../stathat.js');

/**
 * Reverse geocoding
 * @param  {Number}   lat
 * @param  {Number}   lon
 * @param  {Function} callback
 */
function reverse(lat, lon, callback) {
	stathat.count('terre reverse geocoding');
	
	let options = {
		url: 'http://api.geonames.org/countrySubdivisionJSON',
		qs: {
			lat: lat,
			lng: lon,
			level: 3,
			lang: 'it',
			username: config('geonames').username
		},
		json: true,
		timeout: 10000
	};
	
	request(options, (err, response, body) => {
		if (err) {
			logger.warn(err, 'Geonames network error');
			callback({ type: 'network' });
		}
		else if (response.statusCode != 200 || body['status']) {
			if (body['status'] && body['status']['value'] == 15) {
				callback({ type: 'noresults' });
			}
			else {
				logger.warn({ options: options, statusCode: response.statusCode, body: body }, 'Geonames response error');
				callback({ type: 'response' });
			}
		}
		else {
			if (body['countryCode'] == 'IT') {
				if (body['adminName3'] && body['adminCode2']) {
					let name = body['adminName3'];
					name += ' (' + body['adminCode2'] + ')';
					
					callback(null, { name: name, country: body['countryCode'] });
				}
				else {
					callback({ type: 'noresults' });
				}
			}
			else if (body['countryCode'] == 'SM') {
				callback(null, { name: 'San Marino', country: 'SM' });
			}
			else if (body['countryCode'] == 'AT' || body['countryCode'] == 'CH') {
				if (body['adminName3']) {
					callback(null, { name: body['adminName3'], country: body['countryCode'] });
				}
				else {
					callback({ type: 'noresults' });
				}
			}
			else {
				callback({ type: 'invalid' });
			}
		}
	});
}

module.exports.reverse = reverse;
