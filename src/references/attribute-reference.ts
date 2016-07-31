import Reference from '../reference';

export default class AttributeReference {
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