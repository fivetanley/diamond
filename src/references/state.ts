import Reference from '../reference';
import TypeInformation from '../type-information';

export default class StateReference {
  private canonicalReference: Reference;
  private localReference: Reference;
  private typeInformation: TypeInformation;

  constructor(canonicalReference: Reference, localReference: Reference, typeInformation: TypeInformation) {
    this.canonicalReference = canonicalReference;
    this.localReference = localReference;
    this.typeInformation = typeInformation;
  }

  private hasDirtyAttributes() {
    let local = this.localReference.immutableValue();
    let canonical = this.canonicalReference.immutableValue();

    if (!local) {
      return false;
    }

    if (!canonical) {
      return true;
    }

    return canonical.equals(local); 
  }

  value() {
    return {
      hasDirtyAttributes: this.hasDirtyAttributes()
    }
  }
}