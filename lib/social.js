const config   = require('./config')('social').sqs;
const AWS      = require('aws-sdk');
const Producer = require('sqs-producer');
const logger   = require('bole')('social');
const fs       = require('fs');

const sqs = Producer.create({
	queueUrl: config.queueUrl,
	sqs: new AWS.SQS({
		accessKeyId: config.accessKeyId,
		secretAccessKey: config.secretAccessKey,
		region: config.region,
		apiVersion: config.apiVersion
	})
});

module.exports.enqueue = function enqueue(event, callback) {
	if (!event['cardPath']) {
		logger.warn(event, 'Missing cardPath');
		return;
	}
	
	logger.info(`Scheduling card image publish for event ${event.id}`);
	fs.readFile(event['cardPath'], (err, data) => {
		if (err) {
			logger.error(err, event);
			return;
		}
		
		let body = {
			date: event['date'],
			origin: event['origin'],
			magnitude: event['magnitude'],
			city: event['city']
		};
		
		sqs.send({
			id: '1',
			body: JSON.stringify(body),
			messageAttributes: {
				Card: {
					DataType: 'Binary',
					BinaryValue: data
				}
			}
		}, (err) => {
			if (err) {
				console.log(err);
			}
		});
	});
};
