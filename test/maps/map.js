const expect = require('expect');
const nock = require('nock');

const gm = require('gm');

const LocationsMap = require('../../lib/maps').LocationsMap;

describe('maps/locationsmap module', () => {
	before(() => {
		let tiles = [[32, 22], [32, 23], [32, 24], [32, 25], [32, 26], [33, 22], [33, 23], [33, 24], [33, 25], [33, 26], [34, 22], [34, 23], [34, 24], [34, 25], [34, 26], [35, 22], [35, 23], [35, 24], [35, 25], [35, 26], [36, 22], [36, 23], [36, 24], [36, 25], [36, 26]];
		
		tiles.forEach((t) => {
			nock('http://korona.geog.uni-heidelberg.de/tiles/roads/x=' + t[0] + '&y=' + t[1] + '&z=6')
				.get('')
				.replyWithFile(200, __dirname + '/tiles/' + t[0] + '-' + t[1]);
		});
	});
	
	it('should generate locations map', function(done) {
		this.timeout(5000);
		
		let map = new LocationsMap(100);
		
		map.addLocations([[10.893995, 45.918417], [12.288648, 42.010959]]);
		
		map.generate((err, filePath) => {
			expect(err).toNotExist();
			
			gm.compare(filePath, __dirname + '/tiles/out.png', (err, isEqual, equality, raw) => {
				expect(err).toNotExist();
				expect(isEqual).toBe(true);
				
				done();
			});
		});
	});
});
