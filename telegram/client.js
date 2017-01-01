const request  = require('request');
const config   = require('../config');
const db       = require('../db');
const compiler = require('./compiler.js');
const strings  = require('./strings.js');
const logger   = require('bole')('tg');
const fs       = require('fs');

var token = config('telegram').token;

if (!token) {
	throw new Error('Missing token');
}

const BASE_URL = 'https://api.telegram.org/bot' + token;

const ENDPOINTS = {
	sendMessage: BASE_URL + '/sendMessage',
	sendPhoto: BASE_URL + '/sendPhoto',
	editMessage: BASE_URL + '/editMessageText',
	answerCallbackQuery: BASE_URL + '/answerCallbackQuery',
	sendChatAction: BASE_URL + '/sendChatAction',
	getFile: BASE_URL + '/getFile'
};

config['baseFileUrl'] = 'https://api.telegram.org/file/bot' + token;

class TelegramClient {
	constructor() {
		
	}
	
	/**
	 * Analyze Telegram response. Generates a "result" object
	 */
	_analyzeResponse(req, err, res, body) {
		var result = { ok: true };
		
		// Network error
		if (err) {
			var e = {
				request: req,
				error: {
					name: err.name,
					message: err.message,
					stack: err.stack,
					code: err.code
				}
			};
			
			logger.error(e, 'Network error');
			
			result['ok'] = false;
			//result['retry'] = true;
		}
		// Response code is not OK
		else if (res.statusCode != 200) {
			result['ok'] = false;
			//result['retry'] = false;
			
			// Retry the req. in case of Too Many Requests
			// or Telegram server error
			//if (res.statusCode.toString()[0] == '5' || res.statusCode == 429) {
			//	result['retry'] = true;
			//}
			
			if (body && typeof body === 'object') {
				var description = body['description'];
				
				var reasons = [
					// the bot was blocked by the user
					{ text: 'Bot was blocked', stage: -10 },
					// the user doesn't exist anymore
					{ text: 'deleted user', stage: -20 },
					{ text: 'user is deleted', stage: -20 },
					{ text: 'user is deactivated', stage: -20 },
					// the group has been deleted
					{ text: 'group chat is deactivated', stage: -30 },
					// the bot was removed from the (super)group
					{ text: 'bot was kicked from the', stage: -40 },
					{ text: 'bot is not a member of the supergroup chat', stage: -40 }
				];
				
				reasons.forEach((r) => {
					if (description.includes(r['text'])) {
						result['newStage'] = r['stage'];
					}
				});
				
				if (description.includes('migrated to a supergroup')) {
					result['migrate'] = body['parameters']['migrate_to_chat_id'];
				}
				
				if (description.includes('message is not modified')) {
					result['ignore'] = true;
				}
			}
			
			if (!result['newStage'] && !result['migrate'] && !result['ignore']) {
				logger.error({ response: body, request: req }, 'Response error:', res.statusCode);
			}
		}
		// Response content not ok and for some reason statusCode is 200 OK
		else if (body['ok'] === false) {
			logger.error({ response: body, request: req }, 'Response error');
			
			result['ok'] = false;
			//result['retry'] = false;
		}
		
		return result;
	}
	
	_replaceKeyboardPlaceholders(kb) {
		kb.forEach((line) => {
			line.forEach((btn) => {
				if (btn['text'] && btn['text'].slice(0, 2) == '$$') {
					btn['text'] = strings.get(btn['text'].slice(2));
				}
			});
		});
	}
	
	/**
	 * Send a message
	 */
	sendMessage(options, callback) {
		let chatId = options['chat'];
		let text = options['text'];
		let keyboard = options['keyboard'];
		let inline = options['inline'];
		let smallKeyboard = options['smallKeyboard'];
		
		if (!text) {
			text = compiler(options['key'], options['data']);
		}
		
		let kb = {};
		
		if (keyboard) {
			this._replaceKeyboardPlaceholders(keyboard);
			kb = { keyboard: keyboard, one_time_keyboard: true };
			
			if (smallKeyboard) {
				kb['resize_keyboard'] = true;
			}
		}
		else if (inline) {
			this._replaceKeyboardPlaceholders(inline);
			kb = { inline_keyboard: inline };
		}
		
		if (typeof options['hide'] === 'undefined') {
			kb['hide_keyboard'] = true;
		}
		
		let body = {
			chat_id: chatId,
			text: text,
			disable_web_page_preview: true,
			reply_markup: JSON.stringify(kb),
			parse_mode: 'HTML'
		};
		
		let req = {
			method: 'POST',
			body: body,
			json: true,
			url: ENDPOINTS['sendMessage']
		};
		
		request(req, (err, res, resBody) => {
			let result = this._analyzeResponse(req, err, res, resBody);
			
			if (result['newStage']) {
				db.chats.setStage(chatId, result['newStage'], (err) => {
					if (err) {
						logger.error(err, 'Error setting newStage in sendMessage');
					}
				});
			}
			
			if (result['migrate']) {
				db.chats.update(chatId, { id: result['migrate'] }, (err) => {
					if (err) {
						logger.error(err, 'Error migrating chat ID in sendMessage');
					}
				});
			}
			
			callback && callback();
		});
	}
	
	/**
	 * Send a photo
	 */
	sendPhoto(options, callback) {
		var chatId = options['chat'];
		var filePath = options['path'];
		
		var kb = {};
		
		if (options['inline']) {
			this._replaceKeyboardPlaceholders(options['inline']);
			kb['inline_keyboard'] = options['inline'];
		}
		
		var formData = {
			chat_id: chatId,
			photo: fs.createReadStream(filePath),
			reply_markup: JSON.stringify(kb),
			caption: options['caption']
		};
				
		var req = {
			method: 'POST',
			formData: formData,
			json: true,
			url: ENDPOINTS['sendPhoto']
		};
		
		request(req, (err, res, resBody) => {
			var result = this._analyzeResponse(req, err, res, resBody);
			
			if (result['newStage']) {
				db.chats.setStage(chatId, result['newStage'], (err) => {
					if (err) {
						logger.error(err, 'Error setting newStage in sendMessage');
					}
				});
			}
			
			if (result['migrate']) {
				db.chats.update(chatId, { id: result['migrate'] }, (err) => {
					if (err) {
						logger.error(err, 'Error migrating chat ID in sendMessage');
					}
				});
			}
			
			callback && callback();
		});
	}
}

module.exports = TelegramClient;
