const async = require('async');

let db;

function init(thedb, callback) {
	db = thedb;
	
	async.waterfall([
		createGeoIndex,
		createChatIndex,
		createLocationIndex,
		createHistoryIndex
	], callback);
}

function createGeoIndex(callback) {
	db.locations.createIndex({ 'point': '2dsphere' }, (err) => {
		if (err) callback(err);
		else callback();
	});
}

function createChatIndex(callback) {
	db.chats.createIndex({ id: 1 }, { name: 'id' }, (err) => {
		if (err) callback(err);
		else callback();
	});
}

function createLocationIndex(callback) {
	db.locations.createIndex({ chat: 1 }, { name: 'chat' }, (err) => {
		if (err) return callback(err);
		
		db.locations.createIndex({ chat: 1, name: 1 }, { name: 'chat_name' }, (err) => {
			if (err) callback(err);
			else callback();
		});
	});
}

function createHistoryIndex(callback) {
	db.history.createIndex({ date: 1 }, { name: 'date' }, (err) => {
		if (err) return callback(err);
		
		db.history.createIndex({ id: 1 }, { name: 'id' }, (err) => {
			if (err) callback(err);
			else callback();
		});
	});
}

module.exports = init;
