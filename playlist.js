const spawn = require('child_process').spawn;
const glob = require('glob');

const getDir = (path) => {
  const getDirectories = function (src, callback) {
    glob(src + '/**/*', callback);
  };
  return new Promise(resolve => {
    getDirectories(path, function (err, res) {
      if (err) {
        console.log('Error', err);
      } else {
        resolve(res)
      }
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
    const proc = spawn(cmd, args);
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

const generatePlaylist = () => {
	let from = 0;
	return new Promise((resolve) => {
		getDir('./audio')
		.then(async(files) => {
			const mapFiles = files.map(async(file, index) => {
				const duration = await getAudioDuration(file);
				return ({
					from,
					to: from += duration,
					file,
					duration,
				})
			})
			resolve(mapFiles)
		})
	})
}

const getChunk = (file, from, to) => {
	let hasError = false
	const buffer = [];
	const cmd = 'ffmpeg';
	const args = [
	  '-i', file,
	  '-f', 'ogg',
    //'-r', '44100', // -
    //'-ar', '8k',  // +
	  '-ss', from,
	  '-to', to,
	  'pipe:1'
  ];
  
  return new Promise( resolve => {
    const proc = spawn(cmd, args);
    proc.stdout.on('data', function(data) {
      buffer.push(new Buffer.from(data));
    });
  
    proc.on('close', function() {
      if (!hasError) {
        var data = new Buffer.concat(buffer);
        //console.log('BUFF - SIZE',data.length)
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

const getChunkForClient = async(playlist, start, LENGTH) =>{
  let end = start + LENGTH;
  let first = playlist.find(e => e.from <= start && e.to > start)
  if (!first) throw Error('No data');
  
  let ednOffset =  first.to < end ? first.to - end: 0; 
  let buffer = [];
  let files = []

  //console.log(first.file, start - first.from , (end - first.from) + ednOffset)
  await getChunk(first.file, start - first.from , (end - first.from) + ednOffset)
    .then(buff => {
      files.push(stripName(first.file))
      buffer.push(buff)
    }  
  )
    
  if (ednOffset < 0) {
		let second = playlist.find(e => e.from <= end && e.to >= -ednOffset + end )
    if (second) {
      //console.log(second.file, 0 , -ednOffset)
      await getChunk(second.file, 0 , -ednOffset)
        .then(buff => {
          files.push(stripName(second.file));
          buffer.push(buff);
        })
    }
  }

  return {buffer: new Buffer.concat(buffer), files, offset: ednOffset };
}

// module.exports.getAudioDuration = getAudioDuration;
// module.exports.getDir = getDir;
module.exports.generatePlaylist = generatePlaylist;
module.exports.getChunkForClient = getChunkForClient;