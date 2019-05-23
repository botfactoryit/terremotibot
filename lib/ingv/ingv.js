const querystring = require('querystring');
const request = require('request');
const parse = require('xml2js').parseString;
const moment = require('moment-timezone');

const DATETIME_FORMAT = 'YYYY-MM-DDTHH:mm:ss';
const WS_URL = 'http://webservices.ingv.it/fdsnws/event/1/query';

class Ingv {
	constructor(options = {}) {
		if (!options.startDate) {
			// Get the earthquakes for the last 6 hours
			// Previously 24 hours, but useless
			// see https://github.com/botfactoryit/terremotibot/issues/6
			options.startDate = moment.utc().subtract(6, 'hours');
		}
		
		if (!options.endDate) {
			// Choose a endDate in the future for the query, in order
			// to be sure to get all the earthquakes
			options.endDate = moment.utc().add(6, 'hours');
		}
		
		this.startDate = options.startDate;
		this.endDate = options.endDate;
		
		this.minMagnitude = options.minMagnitude || 2;
		this.maxMagnitude = options.maxMagnitude || 10;
		
		this.minLatitude = options.minLatitude || 35;
		this.maxLatitude = options.maxLatitude || 49;
		this.minLongitude = options.minLongitude || 5;
		this.maxLongitude = options.maxLongitude || 20;
		
		this.timeout = options.timeout || 35000;
	}
	
	get(callback) {
		let qs = {
			starttime: this.startDate.format(DATETIME_FORMAT),
			endtime: this.endDate.format(DATETIME_FORMAT),
			minmag: this.minMagnitude,
			maxmag: this.maxMagnitude,
			minlat: this.minLatitude,
			maxlat: this.maxLatitude,
			minlon: this.minLongitude,
			maxlon: this.maxLongitude
		};

		let url = WS_URL + '?' + querystring.stringify(qs);
		
		let req = {
			url: url,
			timeout: this.timeout
		};
		
		let t1 = Date.now();
		
		// Request the INGV web service
		request(req, (err, response, body) => {
			let t2 = Date.now();
			let delta = t2 - t1;
			
			// Network error
			if (err) {
				callback({ type: 'networkError', err, time: delta, url });
				return;
			}
			// No events were returned
			else if (response.statusCode == 204) {
				callback(null, { time: delta, data: [] });
				return;
			}
			// Response status code is not positive
			else if (response.statusCode != 200) {
				callback({ type: 'responseError', statusCode: response.statusCode, body: body.replace(/\n/g, ' '), time: delta, url });
				return;
			}
			
			// Parse the XML response
			parse(body, { explicitArray: false }, (err, result) => {
				// If there was an error parsing the XML payload
				if (err) {
					callback({ type: 'parseError', body: body.replace(/\n/g, ' '), time: delta });
					return;
				}
				
				// Get the array of events from the QuakeML response
				let events = result['q:quakeml']['eventParameters']['event'];
				
				// WTF
				if (!events || typeof events != 'object') {
					callback({ type: 'contentError', body: body.replace(/\n/g, ' '), time: delta });
					return;
				}
				
				// If the response included a single event,
				// 'events' is an object and thus should be converted to an array
				if (!Array.isArray(events)) {
					events = [events];
				}
								
				let earthquakes = [];
				
				// Loop through events and extract data
				events.forEach((ev) => {
					// Earthquake ID
					// It will be extracted from the 'publicID' attributes which looks like
					// smi:webservices.ingv.it/fdsnws/event/1/query?eventId=8863681
					// The dollar sign in the expression below allows to access the attributes of an XML node
					let id = ev.$.publicID.split('=')[1];
					
					// Take out the origin (~hypocenter), and magnitude nodes
					let origin = ev['origin'];
					let magnitude = ev['magnitude'];
					
					// Extract and parse the datetime of the event
					let dateString = origin['time']['value'];
					let date = moment.utc(dateString).toDate();
					
					let earthquake = {
						id: id,
						zone: ev['description']['text'],
						date: date,
						origin: {
							lat: parseFloat(origin['latitude']['value']),
							lon: parseFloat(origin['longitude']['value']),
							depth: origin['depth']['value'] / 1000
						},
						stationsCount: parseInt(origin['quality']['associatedStationCount']),
						magnitude: {
							type: magnitude['type'], // ML or Mw
							value: parseFloat(magnitude['mag']['value']),
							uncertainty: parseFloat(magnitude['mag']['uncertainty']) || 0
						}
					};
					
					earthquakes.push(earthquake);
				});
				
				callback(null, { time: delta, data: earthquakes });
			});
		});
	}
}

module.exports = Ingv;
