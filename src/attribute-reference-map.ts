import Reference from './reference';
import EmptyObject from './empty-object';
import Model from './model';
import AttributeReference from './attribute-reference';
import ModelReference from './model-reference';

export default class AttributeReferenceMap {
  private parentReference: ModelReference;
  protected _references;

  constructor(parentReference: ModelReference) {
    this.parentReference = parentReference;
  }

  protected get references() {
    if (!this._references) {
      this._references = new EmptyObject();
    }
    return this._references;
  }

  static extend(modelClass: Model) {
    let klass = class extends AttributeReferenceMap {};
    let proto = klass.prototype;
    Object.keys(modelClass.attributes).forEach(attr => {
      Object.defineProperty(proto, attr, {
        get() {
          if (!this.references[attr]) {
            this._references[attr] = new AttributeReference(attr, this.parentReference);
          }
          return this.references[attr].value();
        },
        set(value) {
          if (value !== this[attr]) {
            this.parentReference.pushLocal({
              [attr]: value
            });
          }
        }
      })
    });
    return klass;
  }
}