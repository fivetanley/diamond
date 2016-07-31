import Model, { StoreModel, model, AttributeReferences, AttributeReference } from './model';
import TypeInformation from './type-information';
import Reference from './reference';
import { Map, OrderedSet } from 'immutable';
import EmptyObject from './empty-object';

declare function require(name: string);
const uuid = require('node-uuid');
const diff = require('immutable-diff').default;

export {Model};

export class Store {
  private container: EmptyObject;
  private referenceMap: EmptyObject;
  private cache: Cache;

  constructor() {
    this.container = new EmptyObject();
    this.referenceMap = new EmptyObject();
    this.cache = new Cache();
  }

  public defineModel(modelName: string, modelClass: typeof Model) {
    let {container} = this;
    let key = `model:${modelName}`;
    let klass = class extends modelClass {};
    klass.prototype.modelName = modelName;
    container[key] = klass;
  }

  public modelFor(modelName: string): typeof Model {
    let modelKey = `model:${modelName}`;
    let {container} = this;
    let model = container[modelKey];

    let typeInformationKey = `type-information:${modelName}`;
    if (!container[typeInformationKey]) {
      container[typeInformationKey] = new TypeInformation(modelName, container);
    }

    return model;
  }

  public createRecord(modelName: string, data) {
    let ModelClass = this.modelFor(modelName);

    let reference = this.referenceFor(modelName, data.id);
    let id = data.id || uuid.v4();

    const recordData = {
      attributes: data,
      type: modelName,
      id: id
    };

    if (!this.hasRecord(modelName, id)) {
      this.dispatch('createRecord', modelName, id, recordData, (cache, modelName, id, recordData) => {
        return cache.addRecord(recordData);
      });
    }
    return new ModelClass(reference, this.container);
  }

  public pushFromReference(reference, data: jsonapidoc) {
    const {key} = reference;
    this.dispatch('pushFromReference', key, data, (cache, key, data) => {
      return cache.updateRecord(key, data);
    });
  }

  private referenceFromLocalID(localID: string) {
    return this.referenceMap[localID];
  }

  public peekAll(modelName: string) {
    const keys = this.cache.keysForType(modelName);
    const ModelClass = this.modelFor(modelName);
    return keys.map(localID => {
      return new ModelClass(this.referenceFromLocalID(localID), this.container);
    }).toArray();
  }

  public referenceFor(modelName: string, id: string | number) {
    let uuid = this.cache.recordID(modelName, id);
    if (!this.referenceMap[uuid]) {
      this.referenceMap[uuid] = new Reference(uuid, modelName, this);
    }
    return this.referenceMap[uuid];
  }

  public hasRecord(modelName: string, id: string | number) {
    return this.cache.hasRecord(modelName, id);
  }

  public peekRecord(modelName: string, id: string | number) {
    if (this.hasRecord(modelName, id)) {
      let reference = this.referenceFor(modelName, id);
      let ModelClass = this.modelFor(modelName);
      return new ModelClass(reference, this.container);
    }
    return null;
  }

  public unloadReference(reference) {
    this.dispatch('unloadReference', reference.type, reference.key, (cache: Cache, type, key) => {
      delete this.referenceMap[key];
      return cache.unload(reference.type, reference.value().id);
    });
  }

  private dispatch(eventName, ...args) {
    let actionArgs = args.slice(0, -1);
    actionArgs.unshift(this.cache);
    let callback = args[args.length - 1];

    this.cache = callback.apply(null, actionArgs);
  }

  public documentFor(key) {
    return this.cache.getDocument(key);
  }
}

class Cache {
  private state: Map<string, Map<string, any>>;

  constructor() {
    this.state = Map<string, Map<string, any>>();
    this.state = this.state.withMutations(function(mutable: Map<string, Map<string, any>>) {
      mutable.set('records', Map<string, Map<string, any>>());
      mutable.set('recordKeys', Map<string, OrderedSet<string>>());
    });
  }

  public addRecord(data: any) {
    const {id, type} = data;
    const recordID = this.recordID(type, id);
    this.addRecordKey(type, recordID);
    this.records = this.records.set(recordID, Map<string, any>(data));
    return this;
  }

  public updateRecord(key: string, updates) {
    const record = this.records.get(key);
      this.records = this.records.set(key, record.merge(Map(updates)));
    return this;
  }

  public hasRecord(type: string, id: string | number) {
    return this.records.has(this.recordID(type, id));
  }

  public keysForType(type: string) {
    return this.recordKeys.get(type);
  }

  public unload(modelName, id) {
    const localID = this.recordID(modelName, id);
    this.records = this.records.delete(localID);
    const recordKeys = this.recordKeys.get(modelName);
    this.recordKeys = this.recordKeys.set(modelName, recordKeys.delete(localID));
    return this;
  }

  private addRecordKey(type, key: string) {
    const typeRecordKeys = this.createRecordKeysSet(type);
    this.recordKeys = this.recordKeys.set(type, typeRecordKeys.add(key));
  }

  public recordID(modelName, id) {
    return `${modelName}-${id}`;
  }

  private createRecordKeysSet(modelName: string) {
    if (!this.records.has(modelName)) {
      this.recordKeys = this.recordKeys.set(modelName, OrderedSet<string>());
    }
    return this.recordKeys.get(modelName);
  }

  private get records() {
    return this.state.get('records');
  }

  private set records(newRecords: Map<string, Map<string, any>>) {
    this.state = this.state.set('records', newRecords);
  }

  private set recordKeys(newRecordKeys: Map<string, OrderedSet<string>>) {
    this.state = this.state.set('recordKeys', newRecordKeys);
  }

  private get recordKeys() {
    return this.state.get('recordKeys');
  }

  public getDocument(id: string) {
    return this.records.get(id);
  }

}

type jsonapidoc = {
  data: jsonapidoc_data | jsonapidoc_array;
  included?: {}
};

type jsonapidoc_data = {
  id: string,
  attributes: Object,
  relationships?: Object,
  meta?: Object
};

type jsonapidoc_array = jsonapidoc_data[];