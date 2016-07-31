import Reference from './reference';
import TypeInformation from './type-information';
import EmptyObject from './empty-object';
import ModelReference from './references/model-reference';

export default class Model implements StoreModel {
  private _reference: ModelReference;
  public modelName: string;
  private container: EmptyObject;

  static attributes;

  constructor(reference: ModelReference, container: EmptyObject) {
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
    return this._reference.attributeReferenceMap();
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

  get state(): any {
    return this._reference.state;
  }
  
}

export interface StoreModel {
  setAttribute(attribute: string, value: any);
}

export type model = StoreModel;