import {Store, LOCAL, CANONICAL} from './diamond';
import TypeInformation from './type-information';
import {Map} from 'immutable';
import EmptyObject from './empty-object';

class Reference {
  public key: string;
  public type: string;
  private store: Store;
  private __value;
  private doc: Map<string, Map<string, any>>;
  private typeInformation: TypeInformation;
  private instanceVarCache: EmptyObject;
  private locality: string;

  constructor(key: string, type: string, locality: string, store: any, typeInformation: TypeInformation) {
    this.type = type;
    this.key = key;
    this.store = store as Store;
    this.locality = locality;
    this.typeInformation = typeInformation;
    this.doc = null;
  }

  value() {
    if (this.validate()) {
      // do nothing
    } else {
      // update the current value.
      this.doc = this.store.documentFor(this.key, this.locality);
      this.__value = this.doc ? this.doc.toJS() : null;
    }
    //let data = this.store.documentFor(this.key).toJS();
    return this.__value;
  }

  immutableValue() {
    return this.store.documentFor(this.key, this.locality);
  }

  validate() {
    if (!this.doc) {
      return false; 
    }
    let currentDoc = this.store.documentFor(this.key, this.locality);
    return this.doc === currentDoc;
  }

  unload() {
    this.store.unloadReference(this);
  }

  push(newAttributes: any) {
    let {id, type} = this.value();
    this.store.pushFromReference(this, {
      id,
      type,
      attributes: newAttributes
    });
  }
}

export default Reference;