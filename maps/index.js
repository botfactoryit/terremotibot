const geocoding = require('./geocoding.js');
const Card = require('./card.js').Card;

function generateMapWithRadius(lat, lon, radius, callback) {
	// Choose the appropriate zoom level according to the radius kilometers
	// 1-20
	if (radius <= 20) {
		var zoom = 10;
	}
	// 21-50
	else if (radius <= 50) {
		var zoom = 9;
	}
	// 51-100
	else if (radius <= 100) {
		var zoom = 8;
	}
	// 101-200
	else if (radius <= 200) {
		var zoom = 7;
	}
	// 201-300+
	else {
		var zoom = 6;
	}
	
	var center = lat + ',' + lon;
	
	// Calculate a series of points that draw a circumference
	var encoded = helper.calculatePolyline(lat, lon, radius);
	
	var url = `http://maps.google.com/maps/api/staticmap?size=600x600&center=${center}&zoom=${zoom}&language=it&path=fillcolor:0xFF000033|weight:0|enc:${encoded}`;
	url = encodeURI(url);
	
	var fileName = __dirname + '/tmp/maps/' + Date.now().toString() + '.png';
	var stream = fs.createWriteStream(fileName);
	
	request(url)
		.on('error', (err) => {
			logger.error({ url: url, err: err }, 'Static map download error');
			callback(true);
		})
		.pipe(stream)
		.on('finish', () => {
			callback(null, fileName);
		});
}

module.exports.generateMapWithRadius = generateMapWithRadius;
module.exports.Card = Card;
module.exports.geocoding = geocoding;
