const http         = require('http');
const getRawBody   = require('raw-body');

const logger       = require('bole')('server');
const EventEmitter = require('events').EventEmitter;

class TelegramServer extends EventEmitter {
	constructor(options = {}) {
		super();
		this.port = options.port || 8080;
	}
	
	start() {
		this.server = http.createServer(this._handle.bind(this));
		this.server.listen(this.port, (err) => {
			if (err) {
				throw err;
			}
			
			logger.info('Webhook server listening on port', this.port);
		});
	}
	
	_isRequestValid(req) {
		return req.method == 'POST' &&
			req.url == '/' &&
			req.headers['content-type'] == 'application/json';
	}
	
	_handle(req, res) {
		if (!this._isRequestValid(req)) {
			logger.warn(req, 'Invalid request');
			res.writeHead(400);
			res.end();
			return;
		}
		
		let options = {
			length: req.headers['content-length'],
			encoding: 'utf8'
		};
		
		getRawBody(req, options, (err, body) => {
			if (err) {
				logger.warn(req, 'Cannot read body');
				res.writeHead(err.statusCode || 400);
				res.end();
				return;
			}
			
			let payload;
			try {
				payload = JSON.parse(body);
			}
			catch (e) {
				logger.warn('Cannot parse body', body);
				res.writeHead(400);
				res.end();
				return;
			}
			
			this.emit('update', payload);
			
			res.writeHead(200);
			res.end();
		});
	}
}

module.exports = TelegramServer;
