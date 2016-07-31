import { assert } from 'chai';
import {
  Store,
  Model
} from 'diamond';

describe('integration - models', function() {
  let store: Store;

  class Post extends Model {
    static attributes = {
      title: 'string',
      published: 'boolean'
    }
  }

  beforeEach(function() {
    store = new Store();
    store.defineModel('post', Post);
  });

  describe('#hasModel', function() {
    it('is false when the cache does not have data for the model', function() {
      let result = store.hasRecord('post', 1);
      assert.equal(result, false);
    });

    it('is true when the cache does have data for the model', function() {
      store.createRecord('post', {id: 1});
      let result = store.hasRecord('post', 1);
      assert.equal(result, true);
    });
  });

  describe('creating a model', function() {
    let post: Model;

    beforeEach(function() {
      for (let i = 0; i < 100000; i++) {
        post = store.createRecord('post', {
          id: 1,
          title: 'Rails is omakase',
          published: true
        });
      }
    });

    it('creates a model', function() {
      assert.equal(post.attributes.title, 'Rails is omakase', 'attribute stored on creation');
      const record = store.peekRecord('post', 1);
      assert.equal(post.attributes.title, 'Rails is omakase', 'record reachable through store.peekRecord');
    });

    it('can be found in #peekAll once created', function() {
      const all = store.peekAll('post');
      assert.equal(all.length, 1);
      const record = store.peekRecord('post', 1);
      assert.equal(all[0].attributes.title, 'Rails is omakase');
    });
  });

  describe('unloading a model', function() {
    let post: Model;

    beforeEach(function() {
      post = store.createRecord('post', {
        id: 1,
        title: 'Rails is omakase',
        published: true
      });
      post.unload();
    });

    it('is not findable via peekRecord', function() {
      const record = store.peekRecord('post', 1);
      assert.equal(record, null);
    });

    it('does not show up in #peekAll', function() {
      const all = store.peekAll('post');
      assert.equal(all.length, 0);
    });
  });

  describe('updating a model', function() {
    let post: Model;

    beforeEach(function() {
      post = store.createRecord('post', {
        id: 1,
        title: 'Rails is omakase',
        published: true
      });
    });

    it('updates if data changes', function() {
      const newTitle = 'Hood.ie newletter';
      for (let i = 0; i < 100000; i++) {
          post.setAttribute('title', newTitle);
      }
      assert.equal(post.attributes.title, newTitle);
    });
  });
});