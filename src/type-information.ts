import EmptyObject from './empty-object';
import {AttributeReferences} from './model';

export default class TypeInformation {
  public type: string;
  private container: EmptyObject;

  constructor(type: string, container: EmptyObject) {
    this.type = type;
    this.container = container;
  }

  attributeReferencesClass() {
    let {container, type} = this;
    let attributeReferencesKey = `attribute-references:${type}`;

    if (!container[attributeReferencesKey]) {
      let modelKey = `model:${type}`;
      let model = this.container[modelKey];
      let AttributeReferencesClass = AttributeReferences.extend(model);
      container[attributeReferencesKey] = AttributeReferencesClass; 
    }

    return container[attributeReferencesKey];
  }
}