const mongojs = require('mongojs');
const logger  = require('bole')('db');
const config  = require('../config');
const init    = require('./init.js');

const collections = ['chats', 'history', 'incoming', 'outgoing', 'locations'];
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
	
	logger.info('DB initialized');
});

let chats = {
	// Get or create a new 'chat' document in the database,
	// starting from a chat object provided by Telegram
	get(chat, callback) {
		let set = {
			last_seen_at: new Date()
		};
		
		if (chat['first_name']) {
			set['first_name'] = chat['first_name'];
		}
		if (chat['last_name']) {
			set['last_name'] = chat['last_name'];
		}
		if (chat['username']) {
			set['username'] = chat['username'];
		}
		
		// Upsert local user data
		db.chats.findAndModify({
			query: { id: chat['id'] },
			update: {
				$set: set,
				$unset: { status: 1 },
				$setOnInsert: {
					created_at: new Date(),
					settings: {
						radius: 100,
						magnitude: 2
					}
				}
			},
			new: true,
			upsert: true
		}, callback);
	},
	
	setNotificationRadius(chatId, value, callback) {
		let set = {
			updated_at: new Date(),
			'settings.radius': value
		};
		
		db.chats.update({
			id: chatId
		}, {
			$set: set
		}, callback);
	},
	
	setNotificationMagnitude(chatId, value, callback) {
		let set = {
			updated_at: new Date(),
			'settings.magnitude': value
		};
		
		db.chats.update({
			id: chatId
		}, {
			$set: set
		}, callback);
	},
	
	findEligible(lat, lon, magnitude, callback) {
		db.locations.aggregate([
			{
				$geoNear: {
					// The point for which to find the closest documents
					near: {
						type: 'Point',
						coordinates: [lon, lat]
					},
					// The output field name that contains the calculated distance
					distanceField: 'distance',
					// The factor to multiply all distances returned by the query
					// The value converts meters to kilometers
					distanceMultiplier: 0.001,
					// Max range is 300 kilometers
					maxDistance: 300000,
					// This lets MongoDB know that we live on a spherical planet
					spherical: true,
					// Override default value of 100 returned documents
					limit: 100000
				}
			},
			// Replace the 'chat' (ID) field with the full chat object
			{
				$lookup: {
				    from: 'chats',
				    localField: 'chat',
				    foreignField: 'id',
				    as: 'chat'
				}
			},
			// Make sure tha 'chat' field is an object and not an array
			{
				$unwind: {
					path: '$chat'
				}
			},
			// Keep only useful fields
			// And default values for radius and magnitude
			{
				$project: {
					distance: true,
					'chat.id': true,
					'chat.status': true,
					'chat.settings.radius': { $ifNull: ['$chat.settings.radius', 100] },
					'chat.settings.magnitude': { $ifNull: ['$chat.settings.magnitude', 2] }
				}
			},
			// Create the 'eligible' field which
			// determines if the user should be notified
			{
				$project: {
					distance: true,
					'chat.id': true,
					'chat.status': true,
					eligible: {
						$and: [
							{ $lte: ['$distance', '$chat.settings.radius'] },
							{ $gte: [magnitude, '$chat.settings.magnitude'] }
						]
					}
				}
			},
			// Keep only eligible users
			{
				$match: {
					eligible: true,
					'chat.status': null
				}
			},
			// Remove duplicate chat IDs
			{
				$group: {
					_id: '$chat.id',
					//distances: { $push: '$distance' },
					min_distance: { $min: '$distance' }
				}
			},
			// Rename '_id' to 'id'
			{
				$project: {
					_id: false,
					id: '$_id',
					min_distance: true
				}
			},
			// Sort in ascending order, so that users that are near
			// the earthquake will get the notification sooner
			{
				$sort: {
					min_distance: 1
				}
			}
		], callback);
	},
	
	setStatus(chatId, status, callback) {
		db.chats.update({ id: chatId }, { $set: { status: status } }, callback);
	}
};

let locations = {
	find(chatId, callback) {
		db.locations.find({
			chat: chatId
		}, { name: 1 }, callback);
	},
	
	insert(chatId, lat, lon, name, callback) {
		db.locations.insert({
			chat: chatId,
			point: {
				type: 'Point',
				coordinates: [lon, lat]
			},
			name: name
		}, callback);
	},
	
	exists(chatId, name, callback) {
		db.locations.findOne({
			chat: chatId,
			name: name
		}, (err, doc) => {
			if (err) callback(err);
			else callback(null, !!doc);
		});
	},
	
	removeByName(chatId, name, callback) {
		db.locations.remove({
			chat: chatId,
			name: name
		}, callback);
	}
};

let history = {
	findAfterDate(startDate, callback) {
		let query = {
			date: { $gte: startDate }
		};
		
		let projection = {
			_id: false,
			id: 1
		};
		
		db.history.find(query, projection, callback);
	},
	
	insert(doc, callback) {
		db.history.insert(doc, callback);
	},
	
	setCity(eventId, city, callback) {
		db.history.update({
			id: eventId
		}, {
			$set: { city: city }
		}, callback);
	}
};

let incoming = {
	insert(message, callback) {
		db.incoming.insert(message, callback);
	}
};

let outgoing = {
	insert(message, callback) {
		db.outgoing.insert(message, callback);
	}
};

module.exports.chats = chats;
module.exports.history = history;
module.exports.incoming = incoming;
module.exports.outgoing = outgoing;
module.exports.locations = locations;
