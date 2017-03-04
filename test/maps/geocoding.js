const expect = require('expect');
const nock = require('nock');
const geocoding = require('../../lib/maps').geocoding;

describe('geocoding module', () => {
	before(() => {
		nock('http://api.geonames.org')
			.get('/countrySubdivisionJSON')
			.query({
				lat: 46,
				lng: 12,
				level: 3,
				lang: 'it',
				username: 'demo'
			})
			.reply(200, {"adminCode2":"BL","codes":[{"code":"20","type":"FIPS10-4"},{"code":"34","type":"ISO3166-2"}],"adminCode3":"025028","adminName3":"Lentiai","adminCode1":"20","adminName2":"Belluno","distance":0,"countryCode":"IT","countryName":"Italia","adminName1":"Veneto"});
	});
	
	it('should convert Point to place name (Italy)', (done) => {
		geocoding.reverse(46, 12, (err, result) => {
			expect(err).toNotExist();
			expect(result).toEqual({ country: 'IT', name: 'Lentiai (BL)' });
			done();
		});
	});
	
	before(() => {
		nock('http://api.geonames.org')
			.get('/countrySubdivisionJSON')
			.query({
				lat: 43.9429344,
				lng: 12.4250738,
				level: 3,
				lang: 'it',
				username: 'demo'
			})
			.reply(200, {"distance":0,"countryCode":"SM","countryName":"San Marino"});
	});
	
	it('should convert Point to place name (San Marino)', (done) => {
		geocoding.reverse(43.9429344, 12.4250738, (err, result) => {
			expect(err).toNotExist();
			expect(result).toEqual({ country: 'SM', name: 'San Marino' });
			done();
		});
	});
	
	before(() => {
		nock('http://api.geonames.org')
			.get('/countrySubdivisionJSON')
			.query({
				lat: 47.6783135,
				lng: 11.1030076,
				level: 3,
				lang: 'it',
				username: 'demo'
			})
			.reply(200, {"adminCode2":"703","codes":[{"code":"07","type":"FIPS10-4"},{"code":"7","type":"ISO3166-2"}],"adminCode3":"70335","adminName3":"Oberhofen im Inntal","adminCode1":"07","adminName2":"Politischer Bezirk Innsbruck Land","distance":0,"countryCode":"AT","countryName":"Austria","adminName1":"Tirolo"});
	});
	
	it('should convert Point to place name (Austria)', (done) => {
		geocoding.reverse(47.6783135, 11.1030076, (err, result) => {
			expect(err).toNotExist();
			expect(result).toEqual({ country: 'AT', name: 'Oberhofen im Inntal' });
			done();
		});
	});
});
