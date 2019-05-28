const Ingv         = require('./ingv.js');
const db           = require('../db');
const logger       = require('bole')('poller');
const EventEmitter = require('events').EventEmitter;

const DEFAULT_INTERVAL = 2 * 60 * 1000; // 2 minutes

class IngvPoller extends EventEmitter {
	constructor(options = {}) {
		super();
		
		// Updates will be checked every {interval} milliseconds
		let interval = options.interval || DEFAULT_INTERVAL;
		
		setInterval(this.fetch.bind(this), interval);
		
		if (options.immediate === true) {
			// Start fetching now
			setTimeout(this.fetch.bind(this), 0);
		}
	}
	
	fetch() {
		// Initialize the parser
		let ingv = new Ingv();
		
		// Get the IDs of the already-logged events
		// in the same interval of time
		db.history.findAfterDate(ingv.startDate.toDate(), (err, history) => {
			if (err) {
				// Fatal :O
				// TODO: gracefully handle the error and log some details
				throw err;
			}
			
			// Extract previous events' ids
			let ids = history.map((x) => x.id);
			
			// Get earthquake events from INGV
			ingv.get((err, result) => {
				if (err) {
					logger.warn(err, 'INGV request error');
					return;
				}
				
				logger.info('Found', result.data.length, 'events in', result.time, 'ms');
				
				// Filter out only events that haven't been notified yet
				let eventsToBeNotified = [];
				
				result.data.forEach((event) => {
					// If the current event ID is not in the database
					// the event should be notified
					if (!ids.includes(event.id)) {
						eventsToBeNotified.push(event);
					}
				});
				
				if (eventsToBeNotified.length > 0) {
					eventsToBeNotified.sort((x, y) => x.date - y.date);
					
					logger.info(`Storing ${eventsToBeNotified.length} new events`);
					
					// Log events as notified
					db.history.insert(eventsToBeNotified, (err) => {
						if (err) {
							// Houston, we have a problem :O
							throw err;
						}
						
						// Emit the 'earthquakes' event that will cause
						// notifications to be sent out to the users
						this.emit('earthquakes', eventsToBeNotified);
					});
				}
			});
		});
	}
}

module.exports = IngvPoller;
