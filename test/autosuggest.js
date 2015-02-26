'use strict';

process.env.NODE_ENV = 'test';

var test = require('tape'),
    autosuggest = require('../lib/autosuggest');

test('setup', function(t) {
  autosuggest.createIndex('test/fixtures/female-names.txt', function() {
    t.end();
  });
});

test('suggest', function(t) {
  t.test('al', function(t) {
    autosuggest.suggest('al', 5, function(err, results) {
      t.deepEqual(results, ['alaine', 'alameda', 'alana', 'alanah', 'alane']);
      t.end();
    });
  });

  t.test('alan', function(t) {
    autosuggest.suggest('alan', 5, function(err, results) {
      t.deepEqual(results, ['alana', 'alanah', 'alane', 'alanna']);
      t.end();
    });
  });

  t.test('foo', function(t) {
    autosuggest.suggest('foo', 5, function(err, results) {
      t.deepEqual(results, []);
      t.end();
    });
  });

  t.test('el', function(t) {
    autosuggest.suggest('el', 100, function(err, results) {
      t.equal(results.length, 84);
      t.end();
    });
  });

  t.test('e', function(t) {
    autosuggest.suggest('e', 500, function(err, results) {
      t.equal(results.length, 248);
      t.end();
    });
  });

  t.test('ruby', function(t) {
    autosuggest.suggest('ruby', 100, function(err, results) {
      t.deepEqual(results, ['ruby']);
      t.end();
    });
  });

  t.end();
});

test('teardown', function(t) {
  autosuggest.disconnect();
  t.end();
});
