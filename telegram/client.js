const request  = require('request');
const config   = require('../config');
const db       = require('../db');
const compiler = require('./compiler.js');
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
					{ text: 'Bot was blocked', status: -10 },
					// the user doesn't exist anymore
					{ text: 'deleted user', status: -20 },
					{ text: 'user is deleted', status: -20 },
					{ text: 'user is deactivated', status: -20 },
					// the group has been deleted
					{ text: 'group chat is deactivated', status: -30 },
					// the bot was removed from the (super)group
					{ text: 'bot was kicked from the', status: -40 },
					{ text: 'bot is not a member of the supergroup chat', status: -40 }
				];
				
				reasons.forEach((r) => {
					if (description.includes(r['text'])) {
						result['newStatus'] = r['status'];
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
					btn['text'] = compiler(btn['text'].slice(2), {});
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
		
		let archiveMessage = {
			chat: { id: chatId },
			text: text,
			reply_markup: kb,
			date: new Date()
		};
		
		db.outgoing.insert(archiveMessage);
		
		request(req, (err, res, resBody) => {
			let result = this._analyzeResponse(req, err, res, resBody);
			
			if (result['newStatus']) {
				db.chats.setStatus(chatId, result['newStatus'], (err) => {
					if (err) {
						logger.error(err, 'Error setting newStatus in sendMessage');
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
	 * Edit a message
	 */
	editMessage(options, callback) {
		let chatId = options['chat'];
		let text = options['text'];
		let inline = options['inline'];
		let messageId = options['messageId'];
		
		if (!text) {
			text = compiler(options['key'], options['data']);
		}
		
		let kb = {};
		
		if (inline) {
			this._replaceKeyboardPlaceholders(inline);
			kb = { inline_keyboard: inline };
		}
		
		let body = {
			chat_id: chatId,
			text: text,
			message_id: messageId,
			disable_web_page_preview: true,
			reply_markup: JSON.stringify(kb),
			parse_mode: 'HTML'
		};
		
		let req = {
			method: 'POST',
			body: body,
			json: true,
			url: ENDPOINTS['editMessage']
		};
		
		request(req, (err, res, resBody) => {
			this._analyzeResponse(req, err, res, resBody);
			
			// don't care
			callback && callback();
		});
	}
	
	/**
	 * Send a photo
	 */
	sendPhoto(options, callback) {
		let chatId = options['chat'];
		let filePath = options['path'];
		let caption = options['caption'];
		
		if (typeof caption == 'object') {
			caption = compiler(options['caption']['key'], options['caption']['data']);
		}
		
		let kb = {};
		
		if (options['inline']) {
			this._replaceKeyboardPlaceholders(options['inline']);
			kb['inline_keyboard'] = options['inline'];
		}
		
		let formData = {
			chat_id: chatId,
			photo: fs.createReadStream(filePath),
			reply_markup: JSON.stringify(kb),
			caption: caption || ''
		};
				
		let req = {
			method: 'POST',
			formData: formData,
			json: true,
			url: ENDPOINTS['sendPhoto']
		};
		
		let archiveMessage = {
			chat: { id: chatId },
			photo: filePath,
			reply_markup: kb,
			caption: caption,
			date: new Date()
		};
		
		db.outgoing.insert(archiveMessage);
		
		request(req, (err, res, resBody) => {
			let result = this._analyzeResponse(req, err, res, resBody);
			
			if (result['newStatus']) {
				db.chats.setStatus(chatId, result['newStatus'], (err) => {
					if (err) {
						logger.error(err, 'Error setting newStatus in sendMessage');
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
	 * Send chat action
	 */
	sendChatAction(options, callback) {
		let chatId = options['chat'];
		let action = options['action'];
		
		let body = {
			chat_id: chatId,
			action: action
		};
		
		let req = {
			method: 'POST',
			body: body,
			json: true,
			url: ENDPOINTS['sendChatAction']
		};
		
		// Best effort
		request(req, (err, res, resBody) => {
			this._analyzeResponse(req, err, res, resBody);
			
			callback && callback();
		});
	}
}

module.exports = TelegramClient;
