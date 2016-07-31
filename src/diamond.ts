import Model, { StoreModel, model } from './model';
import TypeInformation from './type-information';
import Reference from './reference';
import ModelReference from './model-reference';
import { Map, OrderedSet } from 'immutable';
import EmptyObject from './empty-object';

declare function require(name: string);
const UUID = require('node-uuid');
const diff = require('immutable-diff').default;

const CANONICAL = 'CANONICAL';
const LOCAL = 'LOCAL';

export {Model, CANONICAL, LOCAL};

const EMPTY_SET = OrderedSet<string>();

function cacheData(): Map<string, Map<string, any>> {
  let map = Map<string, Map<string, any>>();
  map = map.set('records', Map<string, any>());
  map = map.set('recordKeys', Map<string, any>());
  return map;
}

export class Store {
  private container: EmptyObject;
  private referenceMap: EmptyObject;
  private cacheMap: Map<string, Map<string, any>>;
  private canonical: Cache;
  private local: Cache;

  constructor() {
    this.container = new EmptyObject();
    this.referenceMap = new EmptyObject();
    this.referenceMap[CANONICAL] = new EmptyObject();
    this.referenceMap[LOCAL] =  new EmptyObject();
    this.cacheMap = Map<string, Map<string, any>>();
    this.cacheMap = this.cacheMap.set(CANONICAL, cacheData());
    this.cacheMap = this.cacheMap.set(LOCAL, cacheData());
    this.canonical = new Cache(this.cacheMap, CANONICAL);
    this.local = new Cache(this.cacheMap, LOCAL);
  }

  updateCanonical(callback: Function) {
    let canonical = this.cacheMap.get('canonical');
    let localData = this.cacheMap.get('local');

    let newCanonical = callback.call(null, canonical, localData);

    this.cacheMap = this.cacheMap.set(CANONICAL, newCanonical);
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

    let id = data.id || UUID.v4();

    const recordData = {
      attributes: data,
      type: modelName,
      id: id
    };

    if (!this.hasRecord(modelName, id)) {
      this.dispatch('createRecord', modelName, id, recordData, (cache: Cache, localCache: Cache, modelName, id, recordData) => {
        return {
          local: cache.addRecord(recordData)
        }
      });
    }
    return new ModelClass(this.modelReferenceFor(modelName, id), this.container);
  }

  public push(data: jsonapidoc) {
    this.dispatch('push', data.data, (canonical: Cache, local: Cache, data) => {
      let canonicalUpdate = canonical.push(data);
      let localUpdate = local.pushImmutable(canonical.getDocument(canonical.recordID(data.type, data.id)));
      return {
        canonical: canonicalUpdate,
        local: localUpdate
      }
    });
  }

  private modelReferenceFor(modelName, id) {
    const uuid = this.canonical.recordID(modelName, id);
    return this.modelReferenceFromAbsoluteKey(modelName, uuid);
  }

  private modelReferenceFromAbsoluteKey(modelName: string, uuid: string) {
    const canonicalReference = this.referenceForAbsoluteKey(modelName, uuid, 'canonical');
    const localReference = this.referenceForAbsoluteKey(modelName, uuid, 'local');
    let typeInformation = this.container[`type-information:${modelName}`];
    return new ModelReference(canonicalReference, localReference, this.container, typeInformation);
  }

  public pushFromReference(reference, data: jsonapidoc_data) {
    const {key} = reference;
    this.dispatch('pushFromReference', key, data, (cache: Cache, localCache: Cache, key, data) => {
      return {
        [reference.locality.toLowerCase()]: cache.updateRecord(key, data)
      }
    });
  }

  private referenceFromLocalID(localID: string, locality: string) {
    const referenceLocality = locality.toUpperCase();
    return this.referenceMap[referenceLocality][localID];
  }

  public peekAll(modelName: string) {
    const canonicalKeys = this.canonical.keysForType(modelName);
    const localKeys = this.local.keysForType(modelName);
    const keys = canonicalKeys.concat(localKeys);
    const ModelClass = this.modelFor(modelName);
    return keys.map(uuid => {
      return this.instantiateFromAbsoluteID(modelName, uuid);
    }).toArray();
  }

  public referenceFor(modelName: string, id: string | number, locality: 'canonical' | 'local' = 'canonical'): Reference {
    const referenceLocality = locality.toUpperCase();
    let uuid = this.canonical.recordID(modelName, id);
    return this.referenceForAbsoluteKey(modelName, uuid, locality);
  }

  private referenceForAbsoluteKey(modelName: string, uuid: string, locality: string): Reference {
    const referenceLocality = locality.toUpperCase();
    if (!this.referenceMap[referenceLocality][uuid]) {
      let typeInformation: TypeInformation = this.container[`type-information:${modelName}`];
      this.referenceMap[referenceLocality][uuid] = new Reference(uuid, modelName, referenceLocality, this, typeInformation);
    }
    return this.referenceMap[referenceLocality][uuid];
  }

  public hasRecord(modelName: string, id: string | number) {
    return this.canonical.hasRecord(modelName, id) || this.local.hasRecord(modelName, id);
  }

  public peekRecord(modelName: string, id: string | number) {
    if (this.hasRecord(modelName, id)) {
      return this.instantiateModel(modelName, id);
    }
    return null;
  }

  private instantiateModel(modelName: string, id) {
    const localID = this.canonical.recordID(modelName, id);
    return this.instantiateFromAbsoluteID(modelName, localID);
  }

  private instantiateFromAbsoluteID(modelName: string, uuid: string) {
    const ModelClass = this.modelFor(modelName);
    const reference = this.modelReferenceFromAbsoluteKey(modelName, uuid);
    return new ModelClass(reference, this.container);
  }

  public unloadReference(reference) {
    this.dispatch('unloadReference', reference.type, reference.key, (cache: Cache, localCache: Cache, type, key) => {
      delete this.referenceMap[reference.locality][key];
      return {
        [reference.locality.toLowerCase()]: cache.unload(reference.type, reference.key)
      }
    });
  }

  private dispatch(eventName, ...args) {
    let actionArgs = args.slice(0, -1);
    actionArgs.unshift(this.canonical, this.local);
    let callback = args[args.length - 1];

    let result = callback.apply(null, actionArgs);

    let {canonical, local} = result;

    this.cacheMap = this.cacheMap.withMutations(cacheMap => {
      if (canonical) {
        cacheMap.set(CANONICAL, canonical);
      }

      if (local) {
        cacheMap.set(LOCAL, local);
      }
    });

    this.canonical.cacheMap = this.cacheMap;
    this.local.cacheMap = this.cacheMap;
  }

  public documentFor(key, locality: string) {
    return this[locality.toLowerCase()].getDocument(key);
  }
}

class Cache {
  private key: string;
  public cacheMap: Map<string, Map<string, any>>;

  constructor(cacheMap: Map<string, Map<string, any>>, key: string) {
    this.key = key;
    this.cacheMap = cacheMap;
  }

  public value() {
    return this.cacheMap.get(this.key);
  }

  private get state() {
    return this.cacheMap.get(this.key);
  }

  private set state(newState) {
    const {key} = this;
    const oldState = this.state;

    this.cacheMap = this.cacheMap.set(key, oldState.merge(newState));
  }

  public addRecord(data: any) {
    const {id, type} = data;
    const recordID = this.recordID(type, id);
    this.addRecordKey(type, recordID);
    this.records = this.records.set(recordID, Map<string, any>(data));
    return this.value();
  }

  public updateRecord(key: string, updates) {
    if (!this.records.has(key)) {
      return this.addRecord(updates);
    }
    const record = this.records.get(key);
    this.records = this.records.set(key, record.mergeDeep(Map(updates)));
    return this.value();
  }

  public updateRecordImmutable(key: string, base: Map<string, Map<string, any>>) {
    let record = this.records.get(key);
    let newData = base.mergeDeep(record);
    this.records = this.records.set(key, newData);
    return this.value();
  }

  // TODO: updateRecord and push should be the same
  push(data: jsonapidoc_data) {
    let key = this.recordID(data.id, data.type);
    this.updateRecord(key, data);
    return this.value();
  }

  pushImmutable(data: Map<string, Map<string, any>>) {
    let key = this.recordID(data.get('id'), data.get('type'));
    this.updateRecordImmutable(key, data);
    return this.value();
  }

  public updateRecordWithImmutable(key: string, updates, immutable: Map<string, Map<string, any>>) {

  }

  public hasRecord(type: string, id: string | number) {
    return this.records.has(this.recordID(type, id));
  }

  public keysForType(type: string) {
    return this.recordKeys.get(type) || EMPTY_SET;
  }

  public unload(modelName: string, localID: string) {
    if (!this.records.size) {
      return this.value();
    }
    this.records = this.records.delete(localID);
    const recordKeys = this.recordKeys.get(modelName);

    this.recordKeys = this.recordKeys.set(modelName, recordKeys.delete(localID));
    return this.value();
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
  type: string,
  attributes: Object,
  relationships?: Object,
  meta?: Object
};

type jsonapidoc_array = jsonapidoc_data[];

