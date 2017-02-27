const helper = require('../lib/helper.js');
const expect = require('expect');

describe('helper module', () => {
	it('should convert Date with two-digit day to pretty date', () => {
		let date = new Date(2016, 10, 10, 12, 0, 0);
		let pretty = helper.dateToPrettyDate(date);
		
		expect(pretty).toBe('10/11/2016');
	});
	
	it('should convert Date with one-digit day to pretty date', () => {
		let date = new Date(2016, 10, 4, 12, 0, 0);
		let pretty = helper.dateToPrettyDate(date);
		
		expect(pretty).toBe('04/11/2016');
	});
	
	it('should convert Date to pretty time', () => {
		let date = new Date(2016, 10, 10, 12, 0, 0);
		let pretty = helper.dateToPrettyTime(date);
		
		expect(pretty).toBe('12:00');
	});
	
	it('should convert Date with one-digit hours and minutes to pretty time', () => {
		let date = new Date(2016, 10, 4, 7, 6, 0);
		let pretty = helper.dateToPrettyTime(date);
		
		expect(pretty).toBe('7:06');
	});
	
	it('should convert true to enabled', () => {
		expect(helper.boolToEnabled(true)).toBe('attive');
	});
	
	it('should convert false to not enabled', () => {
		expect(helper.boolToEnabled(false)).toBe('non attive');
	});
});
