# Music similarity

This module provides similarity information for music tracks. It takes music 
metadata as an argument, and requests results for similar music tracks from a 
[scraping server](https://github.com/peermusic/node-scraping-server). The module broadens
the search to provide a certain amount of results.

## Install

```sh
npm install https://github.com/peermusic/music-similarity
```

```js
var similarity = require('music-similarity')
```

For reference see the [Browserify Handbook](https://github.com/substack/browserify-handbook#how-node_modules-works).

## Usage

```js
var similarity = require('music-similarity')

// Get similarity using a list of scraping servers and a metadata object 
var servers = [{url: 'http://test.de/scraping', key: '...', id: '...'}]
var meta = {title: 'S.O.S.', artist: 'ABBA', album: 'The Albums', genre: 'Pop'}
similarity(servers, meta, function (similar_tracks) {
  // similar_tracks is an array of metadata objects
  console.log(similar_tracks)
})
```