const Facebook = require('fb').Facebook;
const fs = require('fs');

const config = require('../config')('social').facebook;

let fb = new Facebook({ version: '8.0' });
fb.setAccessToken(config.accessToken);

function publish(post, callback) {
	let opts = {
		source: fs.createReadStream(post['imagePath']),
		caption: post['description'],
		backdated_time: post['unix']
	};

	fb.api(`${config.pageId}/photos`, 'post', opts, (res) => {
		if (res.error) {
			callback && callback(res.error);
		}
		else {
			callback && callback(null, res);
		}
	});
}

module.exports = { publish };
