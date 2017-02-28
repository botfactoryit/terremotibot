const bole      = require('bole');
const mongojs   = require('mongojs');
const async     = require('async');
const config    = require('../lib/config');
const init      = require('../lib/db/init.js');
const geocoding = require('../lib/maps').geocoding;

bole.output({ level: 'debug', stream: process.stdout });
const logger = bole('migrate');

const collections = ['chats', 'history', 'locations'];
const dbOptions = { connectTimeoutMS: 5000 };

const db = mongojs(config('db').connectionString, collections, dbOptions);

db.on('error', (err) => {
	throw err;
});

db.on('connect', () => {
	logger.info('DB connected');
});

db.on('timeout', () => {
	throw new Error('Database timeout');
});

init(db, (err) => {
	if (err) {
		throw err;
	}
	
	go();
});

function go() {
	logger.info('Renaming range=>radius and setting default magnitude');
	db.chats.update({}, {
		$rename: {
			'notification.range': 'settings.radius'
		},
		$set: {
			'settings.magnitude': 2.0,
			'settings.broadcast': true
		}
	}, { multi: true }, (err) => {
		if (err) throw err;
		logger.info('Done');
		
		logger.info('Extracting all the chats docs');
		db.chats.find({}, { 'notification.location': 1, id: 1 }, (err, docs) => {
			if (err) throw err;
			logger.info('Done');
			
			let i = 0;
			logger.info('Iterating chats (create location doc and reverse geocode)');
			async.eachSeries(docs, (doc, cb) => {
				i++;
				if (i % 100 == 0) {
					logger.info('Done ' + i + ' / ' + docs.length);
				}
				
				if (doc['notification'] && doc['notification']['location']) {
					let lat = doc['notification']['location']['coordinates'][1];
					let lon = doc['notification']['location']['coordinates'][0];
					
					db.locations.findOne({
						chat: doc['id'],
						point: doc['notification']['location']
					}, (err, exists) => {
						if (err) throw err;
						
						if (exists) {
							cb();
						}
						else {
							geocoding.reverse(lat, lon, (err, result) => {
								let name;
								if (err) {
									name = 'Posizione sconosciuta';
								}
								else {
									name = result['name'];
								}
								
								db.locations.insert({
									chat: doc['id'],
									point: doc['notification']['location'],
									name: name
								}, cb);
							});
						}
					});
				}
				else {
					cb();
				}
			}, (err) => {
				if (err) throw err;
				
				logger.info('Deleting notification field from chats');
				db.chats.update({}, { $unset:  { notification: 1 } }, { multi: true }, (err) => {
					if (err) throw err;
					
					logger.info('Done');
					logger.info('Quitting');
					process.exit(0);
				});
			});
		});
	});
}
