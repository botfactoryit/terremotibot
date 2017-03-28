const expect = require('expect');
const nock = require('nock');

const gm = require('gm');

const Card = require('../../lib/maps').Card;

describe('maps/card module', () => {
	before(() => {
		nock('https://api.mapbox.com')
			.get('/styles/v1/matteocontrini/ciwj780r900232qmqozqa3o0r/static/12.9927,43.007,8/600x484?access_token=demo&logo=false')
			.replyWithFile(200, __dirname + '/cardin.png');
	});
	
	it('should generate card for event', (done) => {
		let card = new Card({
			id: '13589951',
			zone: 'Macerata',
			city: 'Monte Cavallo (MC)',
			date: new Date('2017-02-15T15:48:12Z'),
			origin: {
				lat: 43.007,
				lon: 12.9927,
				depth: 8.2
			},
			stationsCount: 55,
			magnitude: {
				type: 'ML',
				value: 2.5,
				uncertainty: 0.2
			}
		});
		
		card.generate((err, filePath) => {
			expect(err).toNotExist();
			
			gm.compare(filePath, __dirname + '/cardout.jpg', (err, isEqual, equality, raw) => {
				expect(err).toNotExist();
				expect(isEqual).toBe(true);
				
				done();
			});
		});
	});
});
