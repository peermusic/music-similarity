var storage = new (require('in-memory-storage'))()
var rusha = new (require('rusha'))()
var xhr = require('xhr')
var async = require('async')
var messaging = require('secure-client-server-messaging')

module.exports = MusicSimilarity

// Provide similarity information for music files
function MusicSimilarity (servers, metadata, callback) {
  // Check the cache if we already have the results we want
  var hash = rusha.digestFromString(JSON.stringify(metadata))
  var cache = storage.get(hash)

  if (cache) {
    callback(cache)
    return
  }

  // Build the possible queries and send them to the server
  // until we have a certain amount of results
  var queries = possibleQueries(metadata)
  getSimilarTracks(servers, queries, function (tracks) {
    if (tracks.length > 0) {
      storage.set(hash, tracks)
    }
    callback(tracks)
  })
}

// Build the array of possible metadata requests
function possibleQueries (metadata) {
  var queries = []
  if (metadata.title) { queries.push(_only(metadata, ['title', 'album', 'artist'])) }
  if (metadata.album) { queries.push(_only(metadata, ['album', 'artist'])) }
  if (metadata.artist) { queries.push(_only(metadata, ['artist'])) }
  if (metadata.genre) { queries.push(_only(metadata, ['genre'])) }
  return queries
}

// Get only the set keys of an object (but not if they are not set)
function _only (object, keys) {
  var clean = {}
  for (var i = 0; i !== keys.length; i++) {
    if (!object[keys[i]]) {
      continue
    }
    clean[keys[i]] = object[keys[i]]
  }
  return clean
}

// Recursively request similarity information with more and more broad queries
function getSimilarTracks (servers, queries, callback, i, results) {
  i = i || 0
  results = results || []
  var query = queries[i]
  var max_results = 20

  console.log('Sending query:', query)
  requestSimilar(servers, query, function (request_results) {
    // Add the results to our results
    results = results.concat(request_results)
    results = _unique(results)
    console.log(results.length + ' total results...')

    // Request until either we have no queries at the
    // server anymore or we reached the maximum results
    if (!queries[i + 1] || results.length >= max_results) {
      callback(results)
      return
    }

    getSimilarTracks(servers, queries, callback, i + 1, results)
  })
}

// Only get unique results (this is a bit hacky, but less overhead than deep comparison)
function _unique (results) {
  results = results.map(function (x) { return JSON.stringify(x) })
  results = results.filter(function (value, index, self) { return self.indexOf(value) === index })
  results = results.map(function (x) { return JSON.parse(x) })
  return results
}

// Go through each server and request information for this piece of metadata
function requestSimilar (servers, metadata, callback) {
  async.map(servers, function (server, c) {
    requestFromServer(server, metadata, function (response) { c(null, response) })
  }, function (err, results) {
    if (err) throw err
    results = results.length > 0 ? results.reduce(function (x, y) { return x.concat(y) }) : results
    results = _unique(results)
    callback(results)
  })
}

// Request metadata from a single server
function requestFromServer (server, metadata, callback) {
  var encryptedRequest = messaging.encrypt(metadata, server.key)
  encryptedRequest.id = server.id

  var request_object = {
    url: server.url + '/similarTrack',
    method: 'POST',
    body: JSON.stringify(encryptedRequest),
    headers: {'Content-Type': 'application/json'}
  }

  xhr(request_object, function (error, response, body) {
    // Error handling for bad server requests
    if (error || response.statusCode !== 200) {
      console.error('Error requesting metadata from scraping server (' + server + ')', metadata, error, response)
      callback([])
      return
    }

    var payload = messaging.decrypt(JSON.parse(body), server.key)
    callback(payload.result)
  })
}
