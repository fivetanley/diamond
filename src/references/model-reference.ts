import Reference from '../reference';
import EmptyObject from '../empty-object';
import AttributeReferenceMap from './attribute-reference-map';
import TypeInformation from '../type-information';
import StateReference from './state';

export default class ModelReference {
  private canonicalReference: Reference;
  private localReference: Reference;
  private container: EmptyObject;
  private _attributeMap: AttributeReferenceMap;
  private typeInformation: TypeInformation;
  private _state: StateReference;

  constructor(canonicalReference: Reference, localReference: Reference, container: EmptyObject, typeInformation: TypeInformation) {
    this.canonicalReference = canonicalReference;
    this.localReference = localReference;
    this.container = container;
    this.typeInformation = typeInformation;
  }

  unload() {
    this.canonicalReference.unload();
    this.localReference.unload();
  }

  value() {
    let localValue = this.localReference.value();
    if (localValue) {
      return localValue;
    }
    return this.canonicalReference.value();
  }

  push(newAttributes: any) {
    return this.canonicalReference.push(newAttributes);
  }

  pushLocal(newAttributes: any) {
    return this.localReference.push(newAttributes);
  }

  private get attributeMap() {
    if (!this._attributeMap) {
      let ReferenceMap = this.typeInformation.attributeReferenceMapClass();
      this._attributeMap = new ReferenceMap(this);
    }
    return this._attributeMap;
  }

  attributeReferenceMap(): any {
    return this.attributeMap;
  }

  get state() {
    if (!this._state) {
      this._state = new StateReference(this.canonicalReference, this.localReference, this.typeInformation);
    }
    return this._state.value();
  }
}

