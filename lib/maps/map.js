const staticmap = require('staticmapjs');
const logger    = require('bole')('maps');

const TEMP_DIR = require('os').tmpdir();

class LocationsMap {
	constructor(radius) {
		this.radius = radius;
	}
	
	addLocations(locations) {
		if (!locations) {
			throw new Error('arguments[0] can\'t be undefined');
		}
		
		if (!Array.isArray(locations)) {
			locations = [];
		}
		
		this.locations = locations;
	}
	
	generate(callback) {
		let map = staticmap({
			width: 700,
			height: 700,
			center: [12.8, 42],
			zoom: 6,
			// https://leaflet-extras.github.io/leaflet-providers/preview/#filter=OpenMapSurfer.Roads
			tileUrlTemplate: 'https://maps.heigit.org/openmapsurfer/tiles/roads/webmercator/{z}/{x}/{y}.png'
		});
		
		this.locations.forEach((loc) => {
			map.addCircle({
				coordinates: loc,
				radius: this.radius,
				fillColor: '#ff0000B3',
				strokeColor: '#ff0000',
				strokeWidth: 1
			});
		});
		
		let output = TEMP_DIR + '/terre-map-' + Date.now() + '.png';
		
		map.render(output, (err) => {
			if (err) {
				logger.error(err, 'gm error');
				callback(true);
			}
			else {
				callback(null, output);
			}
		});
	}
}

module.exports.LocationsMap = LocationsMap;
