import Reference from './reference';
import TypeInformation from './type-information';
import EmptyObject from './empty-object';

export default class Model implements StoreModel {
  private _reference: Reference;
  private __attributeReferences: AttributeReferences;
  public modelName: string;
  private container: EmptyObject;

  static attributes;
  static __attribute__references__;

  constructor(reference: Reference, container: EmptyObject) {
    this._reference = reference;
    this.container = container;
  }

  get id() {
    return this._reference.value().id;
  }
  get type() {
    return this.modelName;
  }

  private get typeInformation(): TypeInformation {
    return this.container[`type-information:${this.modelName}`];
  }

  get attributes() {
    if (!this.__attributeReferences) {
      let AttributeReferencesClass = this.typeInformation.attributeReferencesClass();
      this.__attributeReferences = <AttributeReferences>(new AttributeReferencesClass(this._reference)); 
    }
    return this.__attributeReferences as any;
  }

  public unload() {
    this._reference.unload();
  }

  setAttribute(attribute: string, value: any) {
    if (this.attributes[attribute] !== value) {
      this._reference.push({
        id: this.id,
        type: this.type,
        attributes: {
          [attribute]: value
        }
      });
    }
  }
}

export interface StoreModel {
  setAttribute(attribute: string, value: any);
}

export type model = StoreModel;

export class AttributeReference {
  private parentReference: Reference;
  private key: string;
  constructor(key: string, parentReference: Reference) {
    this.key = key;
    this.parentReference = parentReference;
  }

  public value() {
    let {key} = this;
    return this.parentReference.value().attributes[key];
  }
}

export class AttributeReferences {
  private parentReference: Reference;
  protected _references;

  constructor(parentReference: Reference) {
    this.parentReference = parentReference;
  }

  protected get references() {
    if (!this._references) {
      this._references = new EmptyObject();
    }
    return this._references;
  }

  static extend(modelClass: Model) {
    let klass = class extends AttributeReferences {};
    let proto = klass.prototype;
    Object.keys(modelClass.attributes).forEach(attr => {
      Object.defineProperty(proto, attr, {
        get() {
          if (!this.references[attr]) {
            this._references[attr] = new AttributeReference(attr, this.parentReference);
          }
          return this.references[attr].value();
        }
      })
    });
    return klass;
  }
}
