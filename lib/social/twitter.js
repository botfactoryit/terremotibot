const Twit = require('twit');
const fs = require('fs');

const config = require('../config')('social').twitter;

let tw = new Twit({
	consumer_key: config.consumerKey,
	consumer_secret: config.consumerSecret,
	access_token: config.accessToken,
	access_token_secret: config.accessTokenSecret
});

function publish(post, callback) {
	fs.readFile(post['imagePath'], (err, data) => {
		if (err) {
			callback && callback(err);
			return;
		}

		let opts = {
			//media: fs.createReadStream(post['imagePath']) // doesn't work with Twit
			media_data: data.toString('base64')
		};

		tw.post('media/upload', opts, (err, data, response) => {
			if (err) {
				callback && callback(err);
				return;
			}

			let mediaId = data['media_id_string'];

			let params = {
				status: post['text'],
				lat: post['lat'],
				long: post['lon'],
				media_ids: [mediaId]
			};

			tw.post('statuses/update', params, (err, data, response) => {
				if (err) {
					callback && callback(err);
				}
				else {
					callback && callback(null, data);
				}
			});
		});
	});
}

module.exports = { publish };
