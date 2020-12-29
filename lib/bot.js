const async  = require('async');
const logger = require('bole')('bot');

// Load internal modules
const config            = require('./config');
const TelegramServer    = require('./telegram').TelegramServer;
const TelegramProcessor = require('./telegram').TelegramProcessor;
const notifications     = require('./telegram/notifications.js');
const db                = require('./db');
const geocoding         = require('./maps').geocoding;
const Card              = require('./maps').Card;
const social            = require('./social');

const BROADCAST_ALWAYS = config('ingv').broadcastAlways;
const BROADCAST_THRESHOLD = config('ingv').broadcastThreshold;
const BROADCAST_RADIUS = config('ingv').broadcastRadius;
const SOCIAL_THRESHOLD = config('social').threshold;
const SOCIAL_ENABLED = config('social').enabled;

function _distanceFromCenter(lat, lon) {
        let lat1 = 41.2909725;  // "Center" of
        let lon1 = 12.572917;   //   Italy
        let lat2 = lat;
        let lon2 = lon;

        let R = 6371e3;
        let p1 = lat1 * Math.PI/180; // φ, λ in radians
        let p2 = lat2 * Math.PI/180;
        let dp = (lat2-lat1) * Math.PI/180;
        let dl = (lon2-lon1) * Math.PI/180;

        let a = Math.sin(dp/2) * Math.sin(dp/2) +
                          Math.cos(p1) * Math.cos(p2) *
                          Math.sin(dl/2) * Math.sin(dl/2);
        let c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

        return R * c / 1000; // in km
}

// Create the HTTP server for handling tg messages
let serverPort = config('telegram').serverPort;
let server = new TelegramServer({ port: serverPort });

// Start the server
server.start();

// Process incoming message
server.on('update', (update) => {
	let pro = new TelegramProcessor(update);
	pro.process();
});

// Create the INGV poller, that will periodically check
// for new earthquakes (comparing the local copy)
const IngvPoller = require('./ingv/poller');

let options = {
	interval: config('ingv').pollingInterval,
	immediate: true
};

let poller = new IngvPoller(options);

// New earthquakes found
// That must be notified
poller.on('earthquakes', (earthquakes) => {
	logger.info(`Notifying ${earthquakes.length} events`);

	// Loop through them
	async.eachSeries(earthquakes, (ev, callback) => {
		logger.info('New event', ev);

		let { lat, lon } = ev['origin'];
		let magnitude = ev['magnitude']['value'];

		logger.info(`Reverse geocoding for event <${ev.id}>`);

		// Convert the geographical coordinates to a city name (reverse geocoding)
		geocoding.reverse(lat, lon, (err, result) => {
			if (err) ; // TODO: do something, please

			let city;
			if (result) {
				city = result['name'];
			}
			else {
				city = ev['zone'];
			}

			ev['city'] = city;
			// Update the db representation of the event
			db.history.setCity(ev['id'], city);

			// Generate the image card
			let card = new Card(ev);
			card.generate((err, filePath) => {
				if (!err && filePath) {
					ev['cardPath'] = filePath;
				}

				if (magnitude >= BROADCAST_THRESHOLD &&
					// broadcast only if the earthquake is >= BROADCAST_ALWAYS or is in a radius with Italy in the center
					(magnitude >= BROADCAST_ALWAYS || _distanceFromCenter(lat, lon) <= BROADCAST_RADIUS)  ) {
					notifications.broadcast(ev, callback);
				}
				else { // FIXME: this "else" means no notifications will be sent if someone is not interested in broadcast but that earthquake is near in his radius. Eg: There's an earthquake of magnitude 9 in Milan, if I'm interested in earthquakes near Milan but not in "big earthquake events" I will not be signaled
					notifications.send(ev, callback);
				}

				// Post to social networks
				if (SOCIAL_ENABLED && magnitude >= SOCIAL_THRESHOLD) {
					social.publish(ev);
				}
			});
		});
	}, () => {
		logger.info('Done');
	});
});

