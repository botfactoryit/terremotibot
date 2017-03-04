let tiles = [[32, 22], [32, 23], [32, 24], [32, 25], [32, 26], [33, 22], [33, 23], [33, 24], [33, 25], [33, 26], [34, 22], [34, 23], [34, 24], [34, 25], [34, 26], [35, 22], [35, 23], [35, 24], [35, 25], [35, 26], [36, 22], [36, 23], [36, 24], [36, 25], [36, 26]];
  
tiles.forEach((tile) => {
	let r = require('request')('http://korona.geog.uni-heidelberg.de/tiles/roads/x=' + tile[0] + '&y=' + tile[1] + '&z=6');
	
	r.on('response', (res) => {
		res.pipe(require('fs').createWriteStream(tile[0] + '-' + tile[1]));
	});
});
