const WebSocketServer = new require('ws');
const {generatePlaylist, getChunkForClient} = require('./playlist');

const LENGTH = 10;
const clients = {};
let webSocketServer; 
let playlist = [];

generatePlaylist()
	.then(async(e) => {
		Promise.all(e).then(files =>{
			playlist = files;
			let port = 8081;
			webSocketServer = new WebSocketServer.Server({
				port,
			});
			webSocketServer.binaryType = 'arraybuffer';
			console.log(`Server start on port: ${port}`)

			webSocketServer.on('connection', function(ws) {
				const id = Math.random();
				clients[id] = ws;
				console.log("New connection " + id);
				
				ws.on('message', function(message) {
					console.log('Got message ' + message);
					getChunkForClient(playlist, +message, LENGTH)
						.then(({buffer, files, offset}) => {
							ws.send(JSON.stringify({type:'info', files, offset }), {binary: false, mask: false}) 
							ws.send(buffer, {binary: true, mask: false})
						})
						.catch((err) => {
							//console.log(err)
							ws.send(JSON.stringify({type:'error', message:'NO DATA'}), {binary: false, mask: false})
						});
				});
			
				ws.on('close', function() {
					delete clients[id];
				});
			});

		})
	})
