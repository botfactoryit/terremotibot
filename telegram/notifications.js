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
	let msg = template(event);
		
	// Generate the image card
	let card = new Card(event);
	card.generate((err, filePath) => {
		let surveyUrl = 'http://www.haisentitoilterremoto.it/xml-server.php?item=quest&action=compile&output=int&event_id=' + event['id'];
		
		const inline = [
			[{ text: '🌍 Dettagli', callback_data: `event;${event.id}` }],
			[{ text: '❗ Hai sentito il terremoto?', url: surveyUrl }]
		];
		
		// No image card generated, fallback to text
		if (err) {
			async.eachSeries(chats, (chat, callback) => {
				// Send text message
				logger.info(`Sending text notification to <${chat.id}>, min_distance <${chat.min_distance}>`);
				
				let options = {
					chat: chat['id'],
					inline: inline,
					text: msg
				};
				
				tg.sendMessage(options, callback);
			}, callback);
			
			return;
		}
		
		async.eachSeries(chats, (chat, callback) => {
			// Send image notification
			logger.info(`Sending image notification to <${chat.id}>, min_distance <${chat.min_distance}>`);
			
			let options = {
				chat: chat['id'],
				path: filePath,
				inline: inline,
				caption: msg
			};
			
			tg.sendPhoto(options, callback);
		}, callback);
	});
}

module.exports.send = send;
