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
const social            = require('./social.js');

const BROADCAST_THRESHOLD = config('ingv').broadcastThreshold;
const SOCIAL_THRESHOLD = config('social').threshold;
const SOCIAL_ENABLED = config('social').enabled;

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
				city = 'Zona ' + ev['zone'];
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
				
				// Prepare and send out notifications to the chats
				// When the process is finished, callback will be called
				// and the next earthquake event processed
				if (magnitude >= BROADCAST_THRESHOLD) {
					notifications.broadcast(ev, callback);
				}
				else {
					notifications.send(ev, callback);
				}
				
				// Schedule SQS
				if (SOCIAL_ENABLED && magnitude >= SOCIAL_THRESHOLD) {
					social.enqueue(ev);
				}
			});
		});
	}, () => {
		logger.info('Done');
	});
});
