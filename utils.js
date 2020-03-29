const getDateDiffFromMidnight = (date) => {
	const hours = date.getHours();
	const minutes =  date.getMinutes();
	const seconds = date.getSeconds();
	const diff = hours * 3600 
		+ minutes * 60 
		+ seconds 
		+ date.getMilliseconds()/1000;
	return diff; //{hours, minutes, seconds, diff};
}

module.exports.getDateDiffFromMidnight = getDateDiffFromMidnight;
