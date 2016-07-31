import {Store} from './diamond';

class Reference {
  public key: string;
  public type: string;
  private store: Store;
  private __value;
  private doc;

  constructor(key: string, type: string, store: any) {
    this.type = type;
    this.key = key;
    this.store = store as Store;
    this.doc = null;
  }

  value() {
    if (this.validate()) {
      // do nothing
    } else {
      // update the current value.
      this.doc = this.store.documentFor(this.key);
      this.__value = this.doc.toJS();
    }
    //let data = this.store.documentFor(this.key).toJS();
    return this.__value;
  }

  validate() {
    if (!this.doc) {
      return false; 
    }
    let currentDoc = this.store.documentFor(this.key);
    return this.doc === currentDoc;
  }

  unload() {
    this.store.unloadReference(this);
  }

  push(newAttributes: any) {
    this.store.pushFromReference(this, newAttributes);
  }
}

export default Reference;