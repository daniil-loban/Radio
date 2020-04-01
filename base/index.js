const { Collection } = require('./collection');

class CacheDB {
  constructor(){
    this.collections = {};
  }
  
  saveCacheData = (cols = Object.keys(this.collections)) => {
    const fs = require('fs');
    return new Promise((resolve, reject) => {
      cols.forEach((collection) => {
        fs.writeFile(
          `${__dirname}/cache/${collection}.json`,
          `${this.collections[collection]}`,
          function(err){
            if(err) throw err;
          }
        );
      })
      resolve();
    });  
  }

  readCacheData = (path) => {
    const fs = require('fs');
    return new Promise((resolve, reject) => {
      fs.readFile(path, 'utf8', function(err, contents) {
        if (!err)  resolve(JSON.parse(contents))
        else reject(Error(`The fail "${path}" is not read`))
      });
    });  
  }

  collection(name) {

    //console.log( Object.keys(this.collections) )
    return this.collections[name];
  }

  promiseInit = (name) => {
    return new Promise((resolve, reject) => {
      this.readCacheData(`${__dirname}/cache/${name}.json`)
        .then(json =>
          { 
            this.collections[name] = new Collection(json)
            resolve()
          })
        .catch(error => console.log(error))  
    });     
  }

  initialize = (collections) => {
    return Promise.all(
      collections.map((key) => this.promiseInit(key)),
    )
  }

  getDB = () => {
    return this
  }

}


///
const findTrack = (track) => {
  let result = tracks.filter(record => {
    Object.keys(track).forEach((key) =>  {
      if (record[key] !== track[key]) return false
    })
    return true;
  })
  return [...result];
}


module.exports.CacheDB = CacheDB;