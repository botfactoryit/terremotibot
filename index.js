const bole   = require('bole');
const fs     = require('fs');
const async  = require('async');
const pretty = require('bistre')();

// Initialize the logger
let outputs = [
	{ level: 'debug', stream: pretty, flush: false },
	{ level: 'debug', stream: fs.createWriteStream(__dirname + '/log/log.log', { flags: 'a' }), flush: true }
];
pretty.pipe(process.stdout);
bole.output(outputs);

var logger = bole('bot');
logger.info('Initializing TerremotiBot...');

// When an expection occurs,
// log the 'Error', end the output streams and euthanasia
process.on('uncaughtException', (err) => {
	logger.error(err);
	
	let closedCount = 0;
	let _outputs = outputs.filter((o) => o.flush === true);
	
	_outputs.forEach((o) => {
		o.stream.once('finish', () => {
			closedCount++;
			
			if (closedCount == _outputs.length) {
				process.exit(1);
			}
		});
		
		o.stream.end();
	});
	
	if (_outputs.length == 0) {
		console.error(err);
		process.exit(1);
	}
});

// Load internal modules
const config            = require('./config');
const TelegramServer    = require('./telegram').TelegramServer;
const TelegramProcessor = require('./telegram').TelegramProcessor;
const notifications     = require('./telegram/notifications.js');
const db                = require('./db');
const geocoding         = require('./maps').geocoding;

// Create the HTTP server for handling tg messages
var serverPort = config('telegram').serverPort;
var server = new TelegramServer({ port: serverPort });

// Start the server
server.start();

// Process incoming message
server.on('update', (update) => {
	var pro = new TelegramProcessor(update);
	pro.process();
});

// Create the INGV poller, that will periodically check
// for new earthquakes (comparing the local copy)
const IngvPoller = require('./ingv/poller');

var options = {
	interval: config('ingv').pollingInterval,
	immediate: true
};

var poller = new IngvPoller(options);

// New earthquakes found
// That must be notified
poller.on('earthquakes', (earthquakes) => {
	logger.info(`Notifying ${earthquakes.length} events`);
	
	// Loop through them
	async.eachSeries(earthquakes, (ev, callback) => {
		logger.info('New event', ev);
		
		let { lat, lon } = ev['origin'];
		let magnitude = ev['magnitude']['value'];
		
		logger.info(`Reverse geocoding for <${ev.id}>`);
		
		// Convert the geographical coordinates to a city name (reverse geocoding)
		geocoding.reverse(lat, lon, (err, result) => {
			let city;
			if (result) {
				city = result['name'];
			}
			else {
				city = 'Zona ' + ev['zone'];
			}
			
			// Update the db representation of the event
			ev['city'] = city;
			db.history.setCity(ev['id'], city);
			
			// Find users that are eligible for the notification
			db.chats.findEligible(lat, lon, magnitude, (err, chats) => {
				if (err) {
					logger.error('findEligible query error', err);
					callback();
					return;
				}
				
				// If there's at least one user to notify
				if (chats.length > 0) {
					// Calculate average and min distance from the earthquake
					let sum = 0;
					let min = 300;
					
					chats.forEach((chat) => {
						sum += chat['min_distance'];
						
						if (chat['min_distance'] < min) {
							min = chat['min_distance'];
						}
					});
					
					var avg = (sum / chats.length).toFixed(2).toString();
					
					logger.info(`Sending notification to <${chats.length}> chats! Avg distance <${avg}>`);
					
					// Prepare and send out notifications to the chats
					// When the process is finished, callback will be called
					// and the next earthquake event processed
					notifications.send(chats, ev, callback);
				}
				else {
					logger.info('No chats to notify');
					
					callback();
				}
			});
		});
	}, () => {
		logger.info('Done');
	});
});
