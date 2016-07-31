import EmptyObject from './empty-object';
import AttributeReferenceMap from './references/attribute-reference-map';

export default class TypeInformation {
  public type: string;
  private container: EmptyObject;

  constructor(type: string, container: EmptyObject) {
    this.type = type;
    this.container = container;
  }

  attributeReferenceMapClass() {
    let {container, type} = this;
    let attributeReferencesKey = `attribute-references:${type}`;

    if (!container[attributeReferencesKey]) {
      let modelKey = `model:${type}`;
      let model = this.container[modelKey];
      let AttributeReferencesClass = AttributeReferenceMap.extend(model);
      container[attributeReferencesKey] = AttributeReferencesClass; 
    }

    return container[attributeReferencesKey];
  }
}