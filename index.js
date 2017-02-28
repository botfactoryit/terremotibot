const bole  = require('bole');

// Initialize the logger
bole.output([{ level: 'debug', stream: process.stdout }]);

const logger = bole('index');
logger.info('TerremotiBot is booting...');

// When an expection occurs,
// log the 'Error' and euthanasia
process.on('uncaughtException', (err) => {
	logger.error(err);
	// We can safely exit because the only logger output is stdout,
	// which is flushed automatically when the process shuts down
	process.exit(1);
});

require('./lib/bot.js');
