const { nanoid } =require('nanoid');
const { Document } = require('./document');
const { Snapshot } = require('./shapshot');

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

module.exports.Collection = Collection;