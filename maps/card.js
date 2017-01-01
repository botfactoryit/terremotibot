const fs         = require('fs');
const request    = require('request');
const gm         = require('gm');
const dateHelper = require('../helper.js');
const logger     = require('bole')('maps');
const config     = require('../config');

const MAPBOX_TOKEN = config('mapbox').token;

class Card {
	constructor(event) {
		this.event = event;
	}
	
	generate(callback) {
		let lat = this.event['origin']['lat'];
		let lon = this.event['origin']['lon'];
		let id = this.event['id'];
		
		logger.info(`Downloading map for <${id}>`);
		
		// Download the static map file from Google Maps
		this._downloadMap(id, lat, lon, (err, mapPath) => {
			if (err) ; // already handled
			
			logger.info(`Composing card for <${id}>`);
			
			// Compose the card with the map and the earthquake details
			this._composeCard(this.event, mapPath, (err, cardPath) => {
				if (err) { // already logged
					callback && callback(true);
				}
				else {
					callback && callback(null, cardPath);
				}
			});
		});
	}
	
	_downloadMap(eventId, lat, lon, callback) {
		let center = lon + ',' + lat;
		
		let url = `https://api.mapbox.com/styles/v1/matteocontrini/ciwj780r900232qmqozqa3o0r/static/${center},8/600x484`;
		url = encodeURI(url);
		
		let fileName = __dirname + '/tmp/maps/' + eventId + '.png';
		let stream = fs.createWriteStream(fileName);
		
		let options = {
			method: 'GET',
			url: url,
			qs: {
				access_token: MAPBOX_TOKEN,
				logo: false
			}
		};
		
		request(options)
			.on('error', (err) => {
				logger.error({ url: url, err: err }, 'Static map download error');
				callback(true);
			})
			.pipe(stream)
			.on('finish', () => {
				callback(null, fileName);
			});
	}
	
	_composeCard(event, mapPath, callback) {
		if (!event['id']) {
			logger.error(event, 'Missing event ID');
			callback(true);
			return;
		}
		
		// Load the template image
		let img = gm(__dirname + '/template.png');
		
		// If the map is available, overlay the image
		if (mapPath && typeof mapPath == 'string') {
			img.draw(`image over 0,116 0,0 '${mapPath}'`);
			img.draw(`image over 0,116 0,0 '${__dirname}/shadow.png`);
			img.draw(`image over 272.5,330.5 0,0 '${__dirname}/pin.png`);
		}
		
		// Set the font
		img.font(__dirname + '/font.otf');
		
		// Big text
		img.fontSize(72);
		// Green text
		img.fill('#73C94B');
		
		// Write the magnitude value
		let mag = event['magnitude']['value'].toFixed(1);
		img.draw(`text 470.25,72 '${mag}'`);
		
		// Write the city name in green, medium size
		img.fontSize(21);
		
		// If the city name is too long
		let city = event['city'];
		if (city.length > 30) {
			// If only the province initials would be left off, leave them out
			if (city[30] == '(' || city[31] == '(') {
				city = city.slice(0, 30).trim();
			}
			else {
				city = city.substring(0, 30).trim() + '…';
			}
		}
		
		img.draw(`text 26,31 '${city.toUpperCase()}'`);
		
		// Small gray text
		img.fontSize(17);
		img.fill('#9B9B9B');
		
		// ML or Mw
		img.draw(`text 562,97 '${event.magnitude.type}'`);
		// Hypocenter depth
		img.draw(`text 147,55 '${event.origin.depth.toFixed(1)} km'`);
		// Date
		let date = dateHelper.dateToPrettyDate(event.date);
		img.draw(`text 81,94 '${date}'`);
		// Time
		let time = dateHelper.dateToPrettyTime(event.date);
		img.draw(`text 247,94 '${time}'`);
		
		let output = __dirname + '/tmp/cards/' + event['id'] + '.png';
		img.write(output, (err) => {
			if (err) {
				logger.error(err, 'gm error', event, img.args());
				callback(true);
			}
			else {
				callback(null, output);
			}
		});
	}
}

module.exports.Card = Card;
