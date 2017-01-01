const polyline = require('polyline');

function circle(lat, lon, rad, detail) {
	var $R = 6371;
	
	var pi = Math.PI;
	var lat = lat * pi / 180;
	var lon = lon * pi / 180;
	
	var d = rad / $R;
	
	var points = [];
	
	var asin = Math.asin;
	var sin = Math.sin;
	var cos = Math.cos;
	var atan2 = Math.atan2;
	
	for (var i = 0; i <= 360; i += detail) {
		var brng = i * pi / 180;
	
		var pLat = asin(sin(lat) * cos(d) + cos(lat) * sin(d) * cos(brng));
		var pLng = ((lon + atan2(sin(brng) * sin(d) * cos(lat), cos(d) - sin(lat) * sin(pLat))) * 180) / pi;
		var pLat = (pLat * 180) / pi;
	
		points.push([pLat, pLng]);
	}
	
	return points;
}

function calculatePolyline(lat, lon, radius) {
	var points = circle(lat, lon, radius, 6);
	var encoded = polyline.encode(points);
	return encoded;
}

module.exports.calculatePolyline = calculatePolyline;
