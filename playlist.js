const spawn = require('child_process').spawn;
const glob = require('glob');

const getDir = (path) => {
  const getDirectories = (src, callback) => glob(src + '/**/*', callback);
  return new Promise(resolve => {
    getDirectories(path, function (err, res) {
      if (err) console.log('Error', err);
      else resolve(res)
    });
  })
}

const getAudioDuration = async(filename) => {
	const cmd = 'ffprobe';
	const args = [
	  '-i', `${filename}`,
	  '-show_entries', 'format=duration',
	  '-v', 'quiet',
	];
  
  return new Promise((resolve) => {
    const proc = spawn(cmd, args, {
      env: {
          NODE_ENV: 'production',
          PATH: process.env.PATH
      }
  });
    let timeSec = 0;
    proc.stdout.on('data', function(data) {
      const str = data.toString();
      const result = str.match(/\[FORMAT\]\nduration=(\d+.\d+)\n\[\/FORMAT\]/)[1];
      timeSec = +result;
    });
    proc.on('close', function() {
      resolve(timeSec)
    });
    proc.stderr.on('data', (data) => {
    });
  })
}

const getChunk = (file, from, to, bitrate='256k') => {
	let hasError = false
	const buffer = [];
	const cmd = 'ffmpeg';
	const args = [
	  '-i', file,
	  '-f', 'ogg',
    //'-r', '44100', // -
    //'-ar', '8k',  // + bitrate
	  '-ss', from,
	  '-to', to,
	  'pipe:1'
  ];
  
  return new Promise( resolve => {
    const proc = spawn(cmd, args,{
      env: {
          NODE_ENV: 'production',
          PATH: process.env.PATH
      }
    });
    proc.stdout.on('data', function(data) {
      buffer.push(new Buffer.from(data));
    });
  
    proc.on('close', function() {
      if (!hasError) {
        const data = new Buffer.concat(buffer);
        resolve(data, {binary: true, mask: false})
      } else {
        //'NO DATA'
      }
    });
  
    proc.stderr.on('data', (data) => {
      hasError = !!(data.toString())
        .match('size=       4kB time=00:00:00.00 bitrate=N/A speed=   0x');
    });
  })
}

const stripName = (file) => {
  let find = file.match(/\.\/.*\/(.*)\..*$/)
  return find[1];
}

const getChunkForClient = async(chunksInfo) => {
  
  
  let files = [];
  let buffer = [];

  const {chunks} = chunksInfo

  const chunked = chunks.map(async(chunk,index) => {
    await getChunk(chunk.file, chunk.start , chunk.end)
      .then(buff => {
        files[index]=stripName(chunk.file);
        buffer[index]=buff;
      })  
  })
  await Promise.all(chunked);  

  const offset = chunks.length === 2 ? chunks[1].end - chunks[1].start : 0;
  return {buffer: new Buffer.concat(buffer), files, offset };
}

module.exports.getAudioDuration = getAudioDuration;
module.exports.getDir = getDir;
module.exports.getChunkForClient = getChunkForClient;