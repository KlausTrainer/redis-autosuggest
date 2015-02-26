'use strict';

const SORTED_SET_KEY = 'redis-autosuggest',
      RANGE_LENGTH = 50, // this is not random, try to get replies < MTU size
      TERMINATOR = '\0';

var fs = require('fs'),
    readline = require('readline'),
    redis = require('redis'),
    redisClient = redis.createClient();

redisClient.on('error', function(err) {
  console.log(err);
  throw err;
});

function addPrefix(prefix) {
  redisClient.zadd(SORTED_SET_KEY, 0, prefix, function(err) {
    if (err) {
      console.log(err);
      throw err;
    }
  });
}

function addWord(word) {
  for (var i = 1; i <= word.length; i++) {
    addPrefix(word.substring(0, i));
  }

  addPrefix(word + TERMINATOR);
}

function createIndex(filename, callback) {
  var reader = readline.createInterface({
    input: fs.createReadStream(filename),
    output: process.stdout,
    terminal: false
  });

  reader.on('line', function(word) {
    addWord(word.trim());
  });

  reader.on('close', function() {
    if (typeof callback === 'function') {
      callback();
    }
  });
}

function suggest(prefix, count, callback) {
  new Promise(
    function(resolve, reject) {
      redisClient.zrank(SORTED_SET_KEY, prefix, function(err, rank) {
        if (err) {
          reject(err);
        } else {
          resolve(rank);
        }
      });
    }
  ).then(
    function(rank) {
      if (rank == null) {
        return [];
      }

      return new Promise(
        function(resolve, reject) {
          var results = [];

          (function gatherResults(offset) {
            if (results.length === count) {
              return resolve(results);
            }

            redisClient.zrange(SORTED_SET_KEY, offset, offset + RANGE_LENGTH - 1, function(err, range) {
              if (err) {
                return reject(err);
              }

              if (range.length === 0) {
                return resolve(results);
              }

              var i, entry, minLength;

              for (i = 0; i < range.length; i++) {
                entry = range[i];
                minLength = entry.length <= prefix.length ? entry.length : prefix.length;

                if (entry.substring(0, minLength) !== prefix.substring(0, minLength)) {
                  return resolve(results);
                }

                if (entry[entry.length - 1] === TERMINATOR) {
                  results.push(entry.substring(0, entry.length - 1));
                }

                if (results.length === count) {
                  return resolve(results);
                }
              }

              gatherResults(offset + RANGE_LENGTH);
            });
          })(rank);
        }
      );
    },
    function(err) {
      return err;
    }
  ).then(
    function(range) {
      callback(null, range);
    },
    function(err) {
      callback(err, null);
    }
  );
}

function disconnect() {
  redisClient.end();
}

exports.createIndex = createIndex;
exports.suggest = suggest;
exports.disconnect = disconnect;
