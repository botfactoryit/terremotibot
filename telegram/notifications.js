const Handlebars = require('handlebars');
const bole       = require('bole');
const async      = require('async');

const TelegramClient = require('./client.js');
const strings        = require('./strings.js');
const Card           = require('../maps').Card;
const helper         = require('../helper.js');

const logger = bole('notifications');

// Create a TelegramClient instance, which exposes
// functions for calling Telegram API methods
const tg = new TelegramClient();

// Register the 'time' handlebars helper,
// which converts Date objects into pretty time representations
Handlebars.registerHelper('time', helper.dateToPrettyTime);

// Compile the handlebars notification template
const template = Handlebars.compile(strings.get('notification'), { noEscape: true });

function send(chats, event, callback) {
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
