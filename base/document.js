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

module.exports.Document = Document;