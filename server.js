const WebSocketServer = new require('ws');

const {
	initDB,
	addDateToDBIfNotExist,
	addTrackToDB,
	updateTracksInDB,
	generatePlaylist,
	fillDayByPlaylists,
	getListOfTracks,
	getListOfPlaylists,
	getDateInfo,
	getChunksInfoByTime,
} = require('./dbAPI');

/*
const {
	LENGTH,
} = require('./constants');



// let playlist = [];
*/

const {
	getDateDiffFromMidnight
} = require('./utils');

const { 
	//getDir,
	//getAudioDuration,
	getChunkForClient
} = require('./playlist');

let webSocketServer; 
const clients = {};

const initServer = async() => {
	await initDB()
	const today = new Date();
	
	await addDateToDBIfNotExist(today);
	await updateTracksInDB();
	
	const tracks  = await	getListOfTracks();
	await	generatePlaylist("0", "testPlaylist", tracks)

	const playlists  = await getListOfPlaylists();
	await fillDayByPlaylists(today, playlists); 

	let port = 8081;
	webSocketServer = new WebSocketServer.Server({ port });
	webSocketServer.binaryType = 'arraybuffer';
	console.log(`Server start on port: ${port}`)

	webSocketServer.on('connection', function(ws) {
		const id = Math.random();
		clients[id] = ws;
		console.log("New connection " + id);
		ws.send(JSON.stringify({type:'query', data: 'getLocalTime'}), {binary: false, mask: false}) 
		
		ws.on('message', async function(message) {
			const json = JSON.parse(message);
			switch(json.type){
				case 'sendLocalTime': {
					const {time} = json;
					clients[id] = {ws, deltaTime: Date.now() - time}
					break;
				}
				case 'getChunk': {
					const {time} = json;
					const dateInfo = await getDateInfo(today);
					const chunksInfo = await getChunksInfoByTime(dateInfo, getDateDiffFromMidnight(new Date(+time)));
					getChunkForClient(chunksInfo)
					.then(({buffer, files, offset}) => {
						ws.send(JSON.stringify({type:'info', files, offset }), {binary: false, mask: false}) 
						ws.send(buffer, {binary: true, mask: false})
					})
					.catch((err) => {
						ws.send(JSON.stringify({type:'error', message:'NO DATA'}), {binary: false, mask: false})
					});
					break;
				}
				default:
					break;	
			}
		});
			
		ws.on('close', function() {
			delete clients[id];
		});
	});
}

initServer();
