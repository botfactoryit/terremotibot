const expect = require('expect');

const db = require('../../lib/db');

describe('db module integration tests', () => {
	before((done) => {
		db._instance.chats.remove({}, done);
	});
	
	describe('chats', () => {
		it('should create a new chat', (done) => {
			let chat = {
				first_name: 'Francesco',
				last_name: 'Tonini',
				username: 'falseusername',
				id: 123
			};
			
			db.chats.get(chat, (err, doc) => {
				expect(err).toNotExist();
				
				expect(doc.id).toBe(123);
				expect(doc.last_seen_at).toBeA(Date);
				expect(doc.first_name).toBe('Francesco');
				expect(doc.last_name).toBe('Tonini');
				expect(doc.username).toBe('falseusername');
				expect(doc.created_at).toBeA(Date);
				expect(doc.settings).toEqual({ radius: 100, magnitude: 2, broadcast: true });
				
				done();
			});
		});
		
		it('should update existing chat', (done) => {
			let chat = {
				id: 123
			};
			
			let nowTs = Date.now();
			
			db.chats.get(chat, (err, doc) => {
				expect(err).toNotExist();
				
				expect(doc.last_seen_at.getTime()).toBeGreaterThanOrEqualTo(nowTs);
				
				done();
			});
		});
		
		it('should update notification radius', (done) => {
			let nowTs = Date.now();
			
			db.chats.setNotificationRadius(123, 65, (err, doc) => {
				expect(err).toNotExist();
				
				db._instance.chats.findOne({ id: 123 }, (err, doc) => {
					expect(err).toNotExist();
					
					expect(doc.updated_at.getTime()).toBeGreaterThanOrEqualTo(nowTs);
					expect(doc.settings.radius).toBe(65);
					
					done();
				});
			});
		});
		
		it('should update notification magnitude', (done) => {
			let nowTs = Date.now();
			
			db.chats.setNotificationMagnitude(123, 4, (err, doc) => {
				expect(err).toNotExist();
				
				db._instance.chats.findOne({ id: 123 }, (err, doc) => {
					expect(err).toNotExist();
					
					expect(doc.updated_at.getTime()).toBeGreaterThanOrEqualTo(nowTs);
					expect(doc.settings.magnitude).toBe(4);
					
					done();
				});
			});
		});
		
		it('should update broadcast setting', (done) => {
			let nowTs = Date.now();
			
			db.chats.setBroadcast(123, false, (err, doc) => {
				expect(err).toNotExist();
				
				db._instance.chats.findOne({ id: 123 }, (err, doc) => {
					expect(err).toNotExist();
					
					expect(doc.updated_at.getTime()).toBeGreaterThanOrEqualTo(nowTs);
					expect(doc.settings.broadcast).toBe(false);
					
					done();
				});
			});
		});
		
		it('should update chat status', (done) => {
			let nowTs = Date.now();
			
			db.chats.setStatus(123, -10, (err, doc) => {
				expect(err).toNotExist();
				
				db._instance.chats.findOne({ id: 123 }, (err, doc) => {
					expect(err).toNotExist();
					
					expect(doc.updated_at.getTime()).toBeGreaterThanOrEqualTo(nowTs);
					expect(doc.status).toBe(-10);
					
					db.chats.get({ id: 123 }, (err, doc) => {
						expect(err).toNotExist();
						
						expect(doc.status).toNotExist;
					});
					
					done();
				});
			});
		});
	});
	
	before((done) => {
		db._instance.locations.remove({}, done);
	});
	
	describe('locations', () => {
		it('should insert a new location', (done) => {
			db.locations.insert(123, 46.075513, 11.120827, 'Trento (TN)', (err) => {
				expect(err).toNotExist();
				
				db.locations.find(123, (err, docs) => {
					expect(err).toNotExist();
					
					expect(docs.length).toBe(1);
					
					delete docs[0]['_id'];
					expect(docs[0]).toEqual({
						point: { type: 'Point', coordinates: [11.120827, 46.075513] },
						name: 'Trento (TN)'
					});
					
					done();
				});
			});
		});
		
		it('should check location existence', (done) => {
			db.locations.exists(123, 'Trento (TN)', (err, exists) => {
				expect(err).toNotExist();
				expect(exists).toBe(true);
				
				done();
			});
		});
		
		it('should remove location', (done) => {
			db.locations.removeByName(123, 'Trento (TN)', (err, exists) => {
				expect(err).toNotExist();
				
				db.locations.find(123, (err, docs) => {
					expect(err).toNotExist();
					expect(docs.length).toBe(0);
					
					done();
				});
			});
		});
	});
	
	before((done) => {
		db._instance.history.remove({}, done);
	});
	
	describe('history', () => {
		let events = [
			{
				id: '13589951',
				zone: 'Macerata',
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
			},
			{
				id: '13876181',
				zone: 'Perugia',
				date: require('moment')().subtract(1, 'hour').toDate(),
				origin: {
					lat: 42.7272,
					lon: 13.0443,
					depth: 10.8
				},
				stationsCount: 37,
				magnitude: {
					type: 'ML',
					value: 2.1,
					uncertainty: 0.2
				}
			},
			{
				id: '13807991',
				zone: 'Rieti',
				date: require('moment')().subtract(23, 'hour').subtract(30, 'minutes').toDate(),
				origin: {
					lat: 42.7512,
					lon: 13.197,
					depth: 10.8
				},
				stationsCount: 54,
				magnitude: {
					type: 'ML',
					value: 2.3,
					uncertainty: 0.3
				}
			}
		];
		
		it('should insert a single event', (done) => {
			let event = events[0];
			
			db.history.insert(event, (err, doc) => {
				expect(err).toNotExist();
				
				db._instance.history.find({}, (err, docs) => {
					expect(err).toNotExist();
					expect(docs.length).toBe(1);
					expect(docs[0]).toEqual(event);
					
					done();
				});
			});
		});
		
		it('should get a single event by event ID', (done) => {
			db.history.findById(events[0]['id'], (err, doc) => {
				expect(err).toNotExist();
				expect(doc).toEqual(events[0]);
				
				done();
			});
		});
		
		it('should set event city', (done) => {
			let city = 'Macerata (MC)';
			events[0]['city'] = city;
			
			db.history.setCity(events[0]['id'], city, (err, res) => {
				expect(err).toNotExist();
				expect(res.n).toBe(1);
				expect(res.nModified).toBe(1);
				
				db.history.findById(events[0]['id'], (err, doc) => {
					expect(err).toNotExist();
					expect(doc).toEqual(events[0]);
					
					done();
				});
			});
		});
		
		it('should extract events of the last day', (done) => {
			db.history.insert(events.slice(1), (err) => {
				expect(err).toNotExist();
				
				db.history.findAfterDate(require('moment')().subtract(1, 'day').toDate(), (err, docs) => {
					expect(err).toNotExist();
					expect(docs.length).toBe(2);
					
					let expected = events.slice(1).map((x) => { return { id: x.id }; });
					expected.reverse();
					
					expect(docs).toEqual(expected);
					
					done();
				});
			});
		});
	});
});
