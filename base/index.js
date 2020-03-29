const { nanoid } =require('nanoid');

class Document {
  constructor(id, document, collection){
    this.collection = collection; // self collection
    this.document = document;
    this.id = id;
  }

  data = () => {
    return {...this.document}
  }

  get() {
    return new Promise((resolve) => {
      resolve(this)
    })
  }

  delete() {
    return new Promise((resolve) => {
      this.collection._deleteDocument(this.id);
      resolve();
    })
  }

  set(data) {
    return new Promise((resolve) => {
      this.document = data
      this.collection._setDocument(this.id, this.document);
      resolve(this.document)
    });  
  } 

  update(updated) {
    return new Promise((resolve) => {
      this.document = {...this.document, ...updated}
      this.collection._setDocument(this.id, this.document);
      resolve(this.document);
    })  
  }

  toString(){
    console.log('this.document.toString')
    return JSON.stringify(this.document, null, 2);
  }
}

class Snapshot{
  constructor(collection){
    this.collection = collection
  }
  docChanges() {
    return Object.keys(this.collection)
      .map(key => {
        const doc = new Document(key, {...this.collection[key]});
        return {
          doc,
          type: "added"
        }
      })
  }
}

class Collection {
  constructor(collection, name){
    this.collection = collection
    this.name = name
  }
  
  onSnapshot(callback){
    return callback(new Snapshot(this.collection))
  }

  doc(id) {
    if (id) {
      return new Document(id, this.collection[id] || {}, this ) // or empty for new
    } else {
      //const keys = Object.keys(this.collection);
      const newId = nanoid();//keys.length !== 0 ? Number(keys.pop()) + 1 : 0;
      return new Document(newId, {}, this ) // new doc;
    }
  }
  
  where(field, condition, test) {
    let result = Object.entries(this.collection).filter(entry => {
      const [key, value] = entry;
      switch(condition){
        case '>':
          return value[field] > test;
        case '<':
          return value[field] < test;
        case '<=':
          return  value[field] <= test;
        case '>=':
          return  value[field] >= test;
        case '==':
          return  value[field] == test;
        case '!=':
          return  value[field] != test;
        case 'in':
          if (test instanceof Array){
            return  test.includes(value[field]);
          }
          return false;
        case 'has':
          if (value[field] instanceof Array){
            return  value[field].includes(test);  
          }
          return false;   
      }
    })

    return new Collection(result.reduce((acc, entry) => {
      const [key, value] = entry;
      acc = {...acc, [key]: value }
      return acc;
    }, {})) 

  } 

  _setDocument(id, document) {
    this.collection[id] = document;
  }

  _deleteDocument(id){
    delete this.collection[id];
  }

  get(){
    return new Promise ((resolve, reject) => {
      if (Object.keys(this.collection).length === 0){
        resolve(null);
      }
      resolve (Object.keys(this.collection)
        .map(key => new Document(key, {...this.collection[key]}, this)))
    })
  }

  toString(){
    //console.log('this.collection.toString')
    return JSON.stringify(this.collection, null, 2);
  }
}

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