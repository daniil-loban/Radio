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

module.exports.Snapshot = Snapshot;