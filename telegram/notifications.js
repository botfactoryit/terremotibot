const bole       = require('bole');
const async      = require('async');

const TelegramClient = require('./client.js');
const Card           = require('../maps').Card;
const db             = require('../db');

const logger = bole('notifications');

// Create a TelegramClient instance, which exposes
// functions for calling Telegram API methods
const tg = new TelegramClient();

function broadcast(event, callback) {
	findEligibleBroadcast(event, (err, chats) => {
		if (err) {
			logger.error(err, 'findEligibleBroadcast query error');
			callback();
			return;
		}
		
		logger.info(`Sending BROADCAST notification for event <${event.id}> to <${chats.length}> chats`);
		
		sendToChats(event, chats, callback);
	});
}

function send(event, callback) {
	findEligible(event, (err, chats) => {
		if (err) {
			logger.error(err, 'findEligible query error');
			callback();
			return;
		}
		
		logger.info(`Sending notification for event <${event.id}> to <${chats.length}> chats`);
		
		sendToChats(event, chats, callback);
	});
}

function findEligible(event, callback) {
	let { lat, lon } = event['origin'];
	let magnitude = event['magnitude']['value'];
	
	// Find users that are eligible for the notification
	db.chats.findEligible(lat, lon, magnitude, (err, chats) => {
		if (err) {
			callback(err);
			return;
		}
		
		db.history.setNotifications(event['id'], chats);
		
		callback(null, chats);
	});
}

function findEligibleBroadcast(event, callback) {
	let { lat, lon } = event['origin'];
	let magnitude = event['magnitude']['value'];
	
	// Find users that are eligible for the broadcast notification
	db.chats.findEligibleBroadcast(lat, lon, magnitude, (err, chats) => {
		if (err) {
			callback(err);
			return;
		}
		
		db.history.setNotifications(event['id'], chats);
		
		callback(null, chats);
	});
}

function sendToChats(event, chats, callback) {
	// Generate the image card
	let card = new Card(event);
	card.generate((err, filePath) => {
		let textOnly = false;
		if (err) {
			textOnly = true;
		}
		
		let surveyUrl = 'http://www.haisentitoilterremoto.it/xml-server.php?item=quest&action=compile&output=int&event_id=' + event['id'];
		
		const inline = [
			[{ text: '$$notification_details', callback_data: `event;${event.id}` }],
			[{ text: '$$notification_survey', url: surveyUrl }]
		];
				
		async.eachSeries(chats, (chat, callback) => {
			// Find the nearest location to the epicentre
			// The distance will be shown in the notification
			let distances = chat['distances'];
			let distance = distances[0];
			
			if (distances.length > 1) {
				for (let i = 1; i < distances.length; i++) {
					if (distances[i]['kms'] < distance['kms']) {
						distance = distances[i];
					}
				}
			}
			
			distance['kms'] = distance['kms'].toFixed(0);
			event['distance'] = distance;
						
			if (textOnly) {
				// There was an error generating the card image
				// Send a text message
				logger.info(`Sending text notification to <${chat.id}>, min_distance <${chat.min_distance}>`);
				
				let options = {
					chat: chat['id'],
					inline: inline,
					key: 'notification',
					data: event
				};
				
				tg.sendMessage(options, callback);
			}
			else {
				// Send image notification
				logger.info(`Sending image notification to <${chat.id}>, min_distance <${chat.min_distance}>`);
				
				let options = {
					chat: chat['id'],
					path: filePath,
					inline: inline,
					caption: {
						key: 'notification',
						data: event
					}
				};
				
				tg.sendPhoto(options, callback);
			}
		}, callback);
	});
}

module.exports.send = send;
module.exports.broadcast = broadcast;
