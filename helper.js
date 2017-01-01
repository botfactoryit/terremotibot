module.exports.dateToPrettyTime = (date) => {
	let hour = date.getHours();
	let minutes = date.getMinutes();
	minutes = ('0' + minutes).slice(-2); // pad zero to the left
	
	return `${hour}:${minutes}`;
};

module.exports.dateToPrettyDate = (date) => {
	let day = date.getDate();
	day = ('0' + day).slice(-2);
	
	let month = date.getMonth() + 1;
	month = ('0' + month).slice(-2);
	
	let year = date.getFullYear();
	
	return `${day}/${month}/${year}`;
};
