const expect = require('expect');
const nock   = require('nock');

const Ingv = require('../../lib/ingv/ingv.js');

function parseDatesRecursive(obj) {
	Object.keys(obj).forEach((key) => {
		let value = obj[key];
		
		if (!value) {
			return;
		}
		
		if (typeof value == 'object') {
			parseDatesRecursive(value);
		}
		else if (/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:[.,]\d+)?Z/i.test(value)) {
			obj[key] = new Date(value);
		}
	});
}

describe('ingv module', () => {
	before(() => {
		nock('http://webservices.ingv.it')
			.get('/fdsnws/event/1/query')
			.query({
				starttime: require('moment').utc().subtract(6, 'hours').format('YYYY-MM-DDTHH:mm:ss'),
				endtime: require('moment').utc().add(6, 'hours').format('YYYY-MM-DDTHH:mm:ss'),
				minmag: 2,
				maxmag: 10,
				minlat: 35,
				maxlat: 49,
				minlon: 5,
				maxlon: 20
			})
			.replyWithFile(200, __dirname + '/ingv1.xml');
	});
	
	it('should load list of earthquakes with defaults', (done) => {
		new Ingv().get((err, res) => {
			expect(err).toNotExist();
			
			let cached = JSON.parse(require('fs').readFileSync(__dirname + '/ingv1.json'));
			parseDatesRecursive(cached);
			
			expect(res['data']).toEqual(cached);
			
			done();
		});
	});
	
	before(() => {
		nock('http://webservices.ingv.it')
			.get('/fdsnws/event/1/query')
			.query(true)
			.replyWithFile(200, __dirname + '/ingv2.xml');
	});
	
	it('should load a single earthquake', (done) => {
		new Ingv().get((err, res) => {
			expect(err).toNotExist();
			
			let cached = JSON.parse(require('fs').readFileSync(__dirname + '/ingv2.json'));
			parseDatesRecursive(cached);
			
			expect(res['data']).toEqual(cached);
			
			done();
		});
	});
	
	before(() => {
		nock('http://webservices.ingv.it')
			.get('/fdsnws/event/1/query')
			.query(true)
			.socketDelay(2000)
			.reply(400);
	});
	
	it('should handle timeouts', (done) => {
		new Ingv({ timeout: 1000 }).get((err, res) => {
			expect(err).toExist();
			expect(err.type).toBe('networkError');
			expect(res).toNotExist();
			
			done();
		});
	});
	
	before(() => {
		nock('http://webservices.ingv.it')
			.get('/fdsnws/event/1/query')
			.query(true)
			.reply(204);
	});
	
	it('should handle empty responses', (done) => {
		new Ingv().get((err, res) => {
			expect(err).toNotExist();
			expect(res.data.length).toBe(0);
			
			done();
		});
	});
});
