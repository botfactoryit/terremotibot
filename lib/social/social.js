const logger = require('bole')('social');

const twitter = require('./twitter.js');
const facebook = require('./facebook.js');

/**
 * Publishes an earthquake event to social networks
 * @param {*} event
 */
function publish(event) {
	// event.cardPath
	// event.date
	// event.origin
	// event.magnitude
	// event.city

	let d = event['date'];
	let time = ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2);

	let magnitude = event['magnitude']['value'].toFixed(1);
	let uncertainty = event['magnitude']['uncertainty'];
	let type = event['magnitude']['type'];
	let city = event['city'];

	let tweet = {
		imagePath: event.cardPath,
		text: `#terremoto alle ${time}\n\nEpicentro: ${city}\nMagnitudo: ${magnitude} ± ${uncertainty} (${type})`,
		lat: event['origin']['lat'],
		lon: event['origin']['lon']
	};

	// Remove epicentre details if the tweet is too long
	if (tweet['text'].length > 280) {
		tweet['text'] = `#terremoto alle ${time}\n\nMagnitudo: ${magnitude} ± ${uncertainty} (${type})`;
	}

	twitter.publish(tweet, (err, tw) => {
		if (err) {
			logger.error(err, 'Error publishing to Twitter');
		}
		else {
			logger.info('Published to Twitter with id=' + tw['id_str']);
		}
	});

	let post = {
		imagePath: event.cardPath,
		description: `#terremoto alle ${time}\n\nEpicentro: ${city}\nMagnitudo: ${magnitude} ± ${uncertainty} (${type})`,
		unix: Math.round(d.getTime() / 1000)
	};

	facebook.publish(post, (err, p) => {
		if (err) {
			logger.error(err, 'Error publishing to Facebook');
		}
		else {
			logger.info('Published to Facebook with id=' + p['id']);
		}
	});
}

module.exports = { publish };
