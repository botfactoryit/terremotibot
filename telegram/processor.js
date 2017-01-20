const logger         = require('bole')('processor');
const db             = require('../db');
const botan          = require('./botan.js');
const TelegramClient = require('./client.js');
const geocoding      = require('../maps').geocoding;

const tg = new TelegramClient();

class TelegramProcessor {
	constructor(update) {
		this.update = update;
	}
	
	process() {
		let tgChat;
		
		// Update type is message
		if (this.update['message']) {
			tgChat = this.update['message']['chat'];
		}
		// Update type is callback query (=> inline button press)
		else if (this.update['callback_query']) {
			tgChat = this.update['callback_query']['message']['chat'];
		}
		
		// Get chat details
		db.chats.get(tgChat, (err, chat) => {
			if (err) {
				logger.error(err, tgChat);
				return;
			}
			
			chat.send = (msg, callback) => {
				msg['chat'] = chat['id'];
				msg['type'] = msg['type'] || 'sendMessage';
								
				if (msg['type'] == 'sendMessage') {
					tg.sendMessage(msg);
				}
				else if (msg['type'] == 'editMessage') {
					tg.editMessage(msg);
				}
				
				// ?
				callback && callback();
			};
			
			chat.error = (callback) => {
				let msg = {
					key: 'error',
					chat: chat['id'],
					type: 'sendMessage'
				};
				
				tg.sendMessage(msg);
				
				// ?
				callback && callback();
			};
			
			this.chat = chat;
			
			if (this.update['message']) {
				this._handleMessage(this.update['message']);
			}
			else if (this.update['callback_query']) {
				this._handleCallback(this.update['callback_query']);
			}
		});
	}
	
	_handleCallback(query) {
		logger.debug(`Incoming <query> from <${this.chat.id}>`);
		let data = query['data'].split(';');
		let messageId = query['message']['message_id'];
		
		if (data[0] == 'settings') {
			if (data[1] == 'radius') {
				let msg = {
					key: 'radius',
					keyboard: [
						[{ text: '25 km' }, { text: '50 km' }, { text: '75 km' }],
						[{ text: '100 km' }, { text: '150 km' }, { text: '200 km' }],
						[{ text: '$$close' }]
					]
				};
				
				this.chat.send(msg);
			}
			else if (data[1] == 'magnitude') {
				let msg = {
					key: 'magnitude',
					keyboard: [
						[{ text: '2.0+' }, { text: '3.0+' }],
						[{ text: '4.0+' }, { text: '5.0+' }],
						[{ text: '$$close' }]
					]
				};
				
				this.chat.send(msg);
			}
			else if (data[1] == 'broadcast') {
				if (data[2]) {
					// Enable or disable broadcast notifications
					let shouldEnable = !!+data[2]; // 0 becomes false, 1 becomes true. Horrible.
					
					db.chats.setBroadcast(this.chat['id'], shouldEnable, (err) => {
						if (err) {
							this.chat.error();
							logger.error(err, 'setBroadcast error');
							return;
						}
						
						this.chat['settings']['broadcast'] = shouldEnable;
						this._sendBroadcastSettingMessage(messageId);
					});
				}
				else {
					this._sendBroadcastSettingMessage();
				}
			}
		}
		else if (data[0] == 'event') {
			let eventId = data[1];
			
			db.history.findById(eventId, (err, event) => {
				if (err) {
					this.chat.error();
					logger.error(err, 'history.findById error');
					return;
				}
				else if (!event) {
					// TODO: answer callback query with error
					return;
				}
				
				let msg = {
					key: 'details',
					data: event,
					inline: [
						[{ text: '$$details_ingv', url: 'http://cnt.rm.ingv.it/event/' + event['id'] }]
					]
				};
				
				this.chat.send(msg);
			});
		}
	}
	
	_sendBroadcastSettingMessage(messageId) {
		let msg = {
			key: 'broadcast',
			inline: [
				[
					{
						text: '$$' + (this.chat['settings']['broadcast'] ? 'broadcast_enabled' : 'broadcast_enable'),
						callback_data: 'settings;broadcast;1'
					},
					{
						text: '$$' + (this.chat['settings']['broadcast'] ? 'broadcast_disable' : 'broadcast_disabled'),
						callback_data: 'settings;broadcast;0'
					}
				]
			]
		};
		
		if (messageId) {
			msg['type'] = 'editMessage';
			msg['messageId'] = messageId;
		}
		
		this.chat.send(msg);
	}
	
	_handleMessage(message) {
		this.message = message;
		message['date'] = new Date(message['date'] * 1000);
		db.incoming.insert(message);
		
		if (message['location']) {
			this._handleLocation();
		}
		else if (message['venue']) {
			this.message['location'] = this.message['venue']['location'];
			this._handleLocation();
		}
		else if (message['text']) {
			this._handleText();
		}
	}
	
	_handleLocation() {
		logger.debug(`Incoming <location> from <${this.chat.id}>`);
		botan.log(this.message, 'location');
		
		let loc = this.message['location'];
		let lat = loc['latitude'];
		let lon = loc['longitude'];
		
		geocoding.reverse(lat, lon, (err, result) => {
			if (err) {
				if (err['type'] == 'network' || err['type'] == 'response') {
					this.chat.error();
				}
				else if (err['type'] == 'invalid') {
					let msg = { key: 'location_invalid' };
					this.chat.send(msg);
				}
				else if (err['type'] == 'noresults') {
					let msg = { key: 'location_noresults' };
					this.chat.send(msg);
				}
				
				return;
			}
			
			let name = result['name'];
			
			db.locations.exists(this.chat['id'], name, (err, exists) => {
				if (err) {
					this.chat.error();
					logger.error(err, 'locations exists');
					return;
				}
				
				if (exists) {
					let msg = { key: 'location_exists' };
					this.chat.send(msg);
				}
				else {
					db.locations.insert(this.chat['id'], lat, lon, name, (err) => {
						if (err) {
							this.chat.error();
							logger.error(err, 'locations insert');
							return;
						}
						
						let msg = {
							key: 'location_ok',
							data: { name }
						};
						
						this.chat.send(msg);
					});
				}
			});
		});
	}
	
	_handleText() {
		logger.debug(`Incoming <text> from <${this.chat.id}>`);
		let text = this.message['text'];
		let cmd = text.replace(/\/ /, '').toLowerCase();
		
		if (cmd.includes('start') || cmd.includes('avvia')) {
			let msg = {
				key: 'start',
				data: {
					name: this.chat['first_name']
				}
			};
			
			this.chat.send(msg);
		}
		else if (cmd.includes('chiudi') || cmd.includes('annulla')) {
			let msg = { key: 'done' };
			this.chat.send(msg);
			
			botan.log(this.message, 'cancel');
		}
		else if (cmd.includes('aiuto') || cmd.includes('help')) {
			let msg = { key: 'help' };
			this.chat.send(msg);
			
			botan.log(this.message, 'help');
		}
		else if (cmd.includes('posizioni')) {
			db.locations.find(this.chat.id, (err, locations) => {
				if (err) {
					this.chat.error();
					logger.error(err, 'locations find');
					return;
				}
				
				if (locations.length == 0) {
					let msg = { key: 'locations_empty' };
					this.chat.send(msg);
				}
				
				let kb = [];
				locations.forEach((loc) => {
					kb.push([{ text: '📍 ' + loc['name'] }]);
				});
				
				kb.push([{ text: '$$close' }]);
				
				let msg = {
					key: 'locations',
					keyboard: kb
				};
				
				this.chat.send(msg);
			});
		}
		else if (cmd.includes('impostazioni')) {
			let msg = {
				key: 'settings',
				data: {
					radius: this.chat['settings']['radius'],
					magnitude: this.chat['settings']['magnitude'],
					broadcast: this.chat['settings']['broadcast']
				},
				inline: [
					[{ text: '$$settings_menu_radius', callback_data: 'settings;radius' }],
					[{ text: '$$settings_menu_magnitude', callback_data: 'settings;magnitude' }],
					[{ text: '$$settings_menu_broadcast', callback_data: 'settings;broadcast' }]
				]
			};
			
			this.chat.send(msg);
			
			botan.log(this.message, 'settings');
		}
		else {
			// Remove a location
			if (text.startsWith('📍')) {
				let name = text.slice(2).trim();
				
				db.locations.removeByName(this.chat['id'], name, (err, res) => {
					if (err) {
						this.chat.error();
						logger.error(err, 'locations remove');
						return;
					}
					
					if (res.n == 0) {
						this.chat.error();
						logger.error(`Couldn\'t remove '${name}' for ${this.chat.id}`);
						return;
					}
					
					let msg = {
						key: 'location_removed',
						data: { name }
					};
					
					this.chat.send(msg);
				});
			}
			else {
				let radiusMatch = text.match(/^([0-9]{2,3}) ?(?:km|chilometri|kilometri)?/i);
				// http://regexr.com/3ev1b
				let magMatch = text.match(/^M? ?([0-9]{1}(?:[,\.]{1}[0-9]{1})?)\+?$/i);
				
				if (radiusMatch) {
					let value = +radiusMatch[1];
					
					if (value > 300) {
						let msg = { key: 'radius_big' };
						this.chat.send(msg);
						return;
					}
					
					db.chats.setNotificationRadius(this.chat['id'], value, (err) => {
						if (err) {
							this.chat.error();
							logger.error(err, 'setNotificationRadius');
							return;
						}
						
						let msg = { key: 'radius_ok', data: { value: value } };
						this.chat.send(msg);
					});
					
					botan.log(this.message, 'radius');
				}
				else if (magMatch) {
					let value = +magMatch[1].replace(',', '.');
					
					if (value < 2) {
						let msg = { key: 'magnitude_small' };
						this.chat.send(msg);
						return;
					}
					
					db.chats.setNotificationMagnitude(this.chat['id'], value, (err) => {
						if (err) {
							this.chat.error();
							logger.error(err, 'setNotificationMagnitude');
							return;
						}
						
						let msg = { key: 'magnitude_ok', data: { value: value.toFixed(1) } };
						this.chat.send(msg);
					});
					
					botan.log(this.message, 'magnitude');
				}
				else {
					let msg = { key: 'dunno' };
					this.chat.send(msg);
					
					botan.log(this.message, 'unknown');
				}
			}
		}
	}
}

module.exports = TelegramProcessor;
