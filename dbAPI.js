const { CacheDB } = require('./base');
const {
	DAYS,
	PLAYLISTS,
	TRACKS,
  AUDIO_PATH,
  LENGTH
} = require('./constants');
const { 
	getDir,
	getAudioDuration,
} = require('./playlist');

const db = new CacheDB();

const initDB = async() => {
  await db.initialize([DAYS, PLAYLISTS, TRACKS]);
}

const dateToString = (date) => {
  return `${date.getDate()}.${date.getMonth()+1}.${date.getFullYear()}`;
}


const addDateToDBIfNotExist = (date) => {
	const dateString = dateToString(date);
	db.collection(DAYS).where('date','==',dateString)
		.get() 
		.then(docs => {
			if (!docs){
				db.collection(DAYS).doc().set({
          date: dateString,
          timestamp: new Date(`${date.getMonth()+1}.${date.getDate()}.${date.getFullYear()}`).getTime()
				})
				.then(_ => {
					db.saveCacheData([DAYS]);
				})
			}
		})
}

const addTrackToDB = (file) => {
	return new Promise((resolve, reject) => {
		db.collection(TRACKS).where('file', '==', file)
		.get()
		.then(async(docs) => {
			if(!docs) {
				const duration = await getAudioDuration(file)
				console.log('add track', file, duration)
				const doc = await db.collection(TRACKS).doc();
				await doc.set({file, duration})
				resolve()
			} else {
				reject()
			} 
		})
	})
}

const updateTracksInDB = async() => {
	let hasChanges = false;
	const files = await getDir(AUDIO_PATH);
	const records = await new Promise( resolve => {
		const records = files.map(async(file) => {
			await addTrackToDB(file)
				.then( _ => { hasChanges = true; 	})
				.catch(_ => { })
			})
			resolve(records);	
		})
	const run = await Promise.all(records); 		
	if (hasChanges){
		console.log('save', TRACKS)
		db.saveCacheData([TRACKS]);
	}
}

const createListWithFromToByDuration = (list) => {
	const withFromTo = list.reduce((acc, e) => {
		lastTime  = acc.length > 0 ? acc[acc.length -1].to : 0;
		acc = [...acc, {...e, from: lastTime, to: lastTime + e.duration } ]
		return acc;
	},[])
	return withFromTo;
} 

const generatePlaylist = async(key, name, tracks) => {
	const doc = await db.collection(PLAYLISTS).doc(key);
	const playlistDuration = tracks.reduce((acc, e) => acc += e.duration ,0)
	const tracksWithTime = createListWithFromToByDuration(tracks);
	const set = await doc.set({
		name,
		duration: playlistDuration,
		tracks: tracksWithTime
	})
	await db.saveCacheData([PLAYLISTS]);
	return set;
}

const fillDayByPlaylists = async(date, playlists) => {
	const dateString = dateToString(date);
	const docs = await db.collection(DAYS).where('date','==',dateString).get();
	const allDayTime = 86400;
	const playlistsDuration = playlists.reduce((acc, e) => acc += e.duration ,0);
	const playlistsWithTime =	createListWithFromToByDuration(playlists)
	const repeats = Math.floor(allDayTime/playlistsDuration);
	const needToFit = allDayTime - repeats * playlistsDuration;
	const docId = docs[0].id; // first key
	await db.collection(DAYS).doc(docId)
		.update({
			playlists: playlistsWithTime,
			repeats,
			needToFit,
		})
		.then(_ => db.saveCacheData([DAYS]));
}

const getListOfTracks = async() => {
  const tracks  = await db.collection(TRACKS).get();
  return tracks.map(doc => /* hack */ ({...doc.document}));
}

const getListOfPlaylists = async() => {
  const playlists  = await db.collection(PLAYLISTS).get();
  return playlists.map(doc => /* hack */ ({...doc.document}))
}

const getDateInfo = async(date) => {
	const dateString = dateToString(date);
	const docs = await db.collection(DAYS).where('date','==',dateString).get();
  if (!docs) return null;
  const docId = docs[0].id; // first key
  const day  = await db.collection(DAYS).doc(docId).get();
  return day.document;
}

const getPlaylistByTime = (playlists, start, end) => {
	// TODO check next day
	let newStart = start;
	let newEnd = end;
	let playlist = playlists.find(e => e.from <= newStart && e.to > newStart)
	let indexPlaylist = playlists.indexOf(playlist);

	if ((!playlist)){ // find in repeats
		playlist = playlists[0] // get first playlist
		newStart = start % playlist.duration;
		newEnd = end % playlist.duration;
	}	
	indexPlaylist = playlists.indexOf(playlist);
	return {
		playlist,
		newStart,
		newEnd,
		indexPlaylist,
	}
}

const getSecondPartByTime = (playlists, playlist, indexPlaylist, end, endOffset) => {
	if (playlists.length -1 <= indexPlaylist){
		end = end % playlist.duration;
		let second = playlist.tracks.find(e => e.from <= end && e.to >= -endOffset + end )
		if (second) return ({ file: second.file, start: 0, end: -endOffset});
	}
	return null;
}

const getChunksInfoByTime = (dateInfo, start) => {
  let end = start + LENGTH;
	let chunks = [];
	let {playlist, newStart, newEnd, indexPlaylist} = getPlaylistByTime(dateInfo.playlists, start, end); 
	let endOffset = 0;
	let first = playlist.tracks.find(e => e.from <= newStart && e.to > newStart)
		
	if (first) {
		endOffset = first.to < newEnd ? first.to - newEnd: 0;
		const firstEnd = newEnd < newStart ? (first.to - first.from) : (newEnd - first.from) + endOffset;
		chunks.push({ file: first.file, start: newStart - first.from , end: firstEnd })
		if (chunks[0].start < 0 || chunks[0].end < 0) console.log('error time[1]', start, chunks[0]);
	} else {
	  console.log('first not found', newStart, newEnd ) /* MUST BE ERROR */	
	}

	if (endOffset < 0 || newEnd < newStart) {  
		let second = playlist.tracks.find(e => e.from <= newEnd && e.to >= -endOffset + newEnd )
		if (second) {
			const secondEnd = newEnd < newStart ? newEnd : -endOffset;
			chunks.push({ file: second.file, start: 0, end: secondEnd })
		} else {
			let result = getSecondPartByTime(dateInfo.playlists,playlist,indexPlaylist, newEnd, endOffset);
			if (result) chunks.push({file: result.file,	start: result.start, end: result.end })
			if (chunks[1].start < 0 || chunks[1].end < 0) console.log('error time [2]', start, chunks[1])
		}
	}  
	return chunks;
}

module.exports.initDB = initDB;
module.exports.addDateToDBIfNotExist = addDateToDBIfNotExist;
module.exports.addTrackToDB = addTrackToDB;
module.exports.updateTracksInDB = updateTracksInDB;
module.exports.generatePlaylist = generatePlaylist;
module.exports.fillDayByPlaylists = fillDayByPlaylists;
module.exports.getListOfTracks = getListOfTracks;
module.exports.getListOfPlaylists = getListOfPlaylists;
module.exports.getDateInfo = getDateInfo;
module.exports.getChunksInfoByTime = getChunksInfoByTime;

/*  EXAMPLES

await db.collection('days').doc(1).set({date: '29.03.2020'});
await db.collection('days').doc(3).set({date: '01.04.2020'});
await db.collection('days').doc(2).update({'some': 'some data'})
console.log(`${db.collection('days')}`);
await db.collection('days').doc(1).delete()
	.then(_ => {
		db.saveCacheData()
	})

db.collection('days').where('date', '!=', '29.03.2020')
	.get()
	.then( e => {
		e.forEach(doc => {
			console.log('day', doc.id, doc.data());
		})
		
	})
*/	


