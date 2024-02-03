//import * as Bezier from "./components/bezier";

const Bezier = require("./components/bezier");
// put in whatever javascript you want to test here
const assert = function (condition, message) {
   if (!condition)
      throw Error('Assert failed: ' + (message || ''));
};

function arrayEquals(a, b) {
   return Array.isArray(a) &&
      Array.isArray(b) &&
      a.length === b.length &&
      a.every((val, index) => val === b[index]);
}
function testBezier() {

   assert(arrayEquals([1, 1], Bezier.berenstienCoefficients(2)));
   assert(arrayEquals([1, 2, 1], Bezier.berenstienCoefficients(3)));
   assert(arrayEquals([1, 3, 3, 1], Bezier.berenstienCoefficients(4)));
   assert(arrayEquals([1, 4, 6, 4, 1], Bezier.berenstienCoefficients(5)));
   assert(arrayEquals([1, 5, 10, 10, 5, 1], Bezier.berenstienCoefficients(6)));
   assert(arrayEquals([1, 6, 15, 20, 15, 6, 1], Bezier.berenstienCoefficients(7)));

   let controlPoints = [[0, 0], [50, 0], [50, 100], [100, 100]];
   let spline = Bezier.getSplineFunc(controlPoints);
   assert(spline instanceof Function);

   assert(arrayEquals([0, 0], spline(0)));
   assert(arrayEquals([42.4, 35.2], spline(0.4)));
   assert(arrayEquals([50, 50], spline(0.5)));
   assert(arrayEquals([86.4, 97.2], spline(0.9)));
   assert(arrayEquals([100, 100], spline(1)));


   console.log(`\nspline control points ${controlPoints}`);

   for (let t = 0.0; t <= 10; t++) {
      console.log(`spline at ${t * 0.1} is ${spline(t * 0.1)}`);
   }

   let controlPointsReverse = [[100, 100], [50, 100], [50, 0], [0, 0]];
   console.log(`\nspline control points ${controlPointsReverse}`);
   for (let t = 0; t <= 10; t++) {
      console.log(`spline at ${t * 0.1} is ${spline(t * 0.1, controlPointsReverse)}`);
   }

   assert(arrayEquals([100, 100], spline(0, controlPointsReverse)));
   assert(arrayEquals([50, 50], spline(0.5, controlPointsReverse)));
   assert(arrayEquals([0, 0], spline(1, controlPointsReverse)));

   assert(arrayEquals([0, 0], Bezier.getSplineAt(controlPoints, 0)));
   assert(arrayEquals([50, 50], Bezier.getSplineAt(controlPoints, 0.5)));
   assert(arrayEquals([100, 100], Bezier.getSplineAt(controlPoints, 1)));

   //let controlPoints = [[2.5, 0.5],
   //[1.5, 5.0],
   //[6.0, 5.0],
   //[10.0, 0.5]];
}



/*
Our local radio station is running a show where the songs are ordered in a very specific way.  The last word of the title of one song must match the first word of the title of the next song - for example, "Silent Running" could be followed by "Running to Stand Still".  No song may be played more than once.
 
Given a list of songs and a starting song, find the longest chain of songs that begins with that song, and the last word of each song title matches the first word of the next one.  Write a function that returns the longest such chain. If multiple equivalent chains exist, return any of them.
 
Example:
songs1 = [
    "Down By the River",
    "River of Dreams",
    "Take me to the River",
    "Dreams",
    "Blues Hand Me Down",
    "Forever Young",
    "American Dreams",
    "All My Love",
    "Cantaloop",
    "Take it All",
    "Love is Forever",
    "Young American",
    "Every Breath You Take",
]
song1_1 = "Every Breath You Take"
chaining(songs1, song1_1) => ['Every Breath You Take', 'Take it All', 'All My Love', 'Love is Forever', 'Forever Young', 'Young American', 'American Dreams', 'Dreams']
 
Additional Input:
song1_2 = "Dreams"
song1_3 = "Blues Hand Me Down"
song1_4 = "Cantaloop"
 
songs2 = [
    "Bye Bye Love",
    "Nothing at All",
    "Money for Nothing",
    "Love Me Do",
    "Do You Feel Like We Do",
    "Bye Bye Bye",
    "Do You Believe in Magic",
    "Bye Bye Baby",
    "Baby Ride Easy",
    "Easy Money",
    "All Right Now",
]
song2_1 = "Bye Bye Bye"
song2_2 = "Bye Bye Love"
 
songs3 = [
    "Love Me Do",
    "Do You Believe In Magic",
    "Magic You Do",
    "Magic Man",
    "Man In The Mirror"
]
song3_1 = "Love Me Do"
 
All Test Cases:
chaining(songs1, song1_1) => ['Every Breath You Take', 'Take it All', 'All My Love', 'Love is Forever', 'Forever Young', 'Young American', 'American Dreams', 'Dreams']
chaining(songs1, song1_2) => ['Dreams']
chaining(songs1, song1_3) => ['Blues Hand Me Down', 'Down By the River', 'River of Dreams', 'Dreams']
chaining(songs1, song1_4) => ['Cantaloop']
chaining(songs2, song2_1) => ['Bye Bye Bye', 'Bye Bye Baby', 'Baby Ride Easy', 'Easy Money', 'Money for Nothing', 'Nothing at All', 'All Right Now']
chaining(songs2, song2_2) => ['Bye Bye Love', 'Love Me Do', 'Do You Feel Like We Do', 'Do You Believe in Magic']
chaining(songs3, song3_1) => ['Love Me Do', 'Do You Believe in Magic', 'Magic Man', 'Man In The Mirror']
 
Complexity Variable:
n = number of songs in the input
*/
const songs1 = [
   'Down By the River',
   'River of Dreams',
   'Take me to the River',
   'Dreams',
   'Blues Hand Me Down',
   'Forever Young',
   'Forever and Ever',
   'American Dreams',
   'All My Love',
   'Cantaloop',
   'Take it All',
   'Love is Forever',
   'Young American',
   'Every Breath You Take'
];
const song1_1 = 'Every Breath You Take';
const song1_2 = 'Dreams';
const song1_3 = 'Blues Hand Me Down';
const song1_4 = 'Cantaloop';

const songs2 = [
   'Bye Bye Love',
   'Nothing at All',
   'Money for Nothing',
   'Love Me Do',
   'Do You Feel Like We Do',
   'Bye Bye Bye',
   'Do You Believe in Magic',
   'Bye Bye Baby',
   'Baby Ride Easy',
   'Easy Money',
   'All Right Now'
];
const song2_1 = 'Bye Bye Bye';
const song2_2 = 'Bye Bye Love';

const songs3 = [
   'Love Me Do',
   'Do You Believe In Magic',
   'Magic You Do',
   'Magic Man',
   'Man In The Mirror'
];
const song3_1 = 'Love Me Do';


const songs4 = [
   'Love Me Do',
   'Do You Believe In Magic',
   'Magic You Do',
   'Do You Really Love Me',
   'Magic Man',
   'Man In The Mirror'
];

function getSongFirstAndLast(songTitle) {
   let words = songTitle.split(' ');
   return { first: words[0], last: words[words.length - 1] };
}

//function deepCopy(o) {
//    return JSON.parse(JSON.stringify(o));
//}

function toString(ob) {
   return JSON.stringify(ob, null, 2);
}

function getAllSongWordsFirstAndLast(songTitles) {
   let songsFirstAndLast = [];
   songTitles.forEach((currentElement) => {
      let songFirstAndLast = getSongFirstAndLast(currentElement);
      songsFirstAndLast.push(songFirstAndLast);
   });
   return (songsFirstAndLast);
}

function getSongWordsNodes(songTitles) {
   let songsFirstAndLast = getAllSongWordsFirstAndLast(songTitles);
   let songNodes = [];
   songsFirstAndLast.forEach((first, i) => {
      let node = { index: i, connections: [] };
      songsFirstAndLast.forEach((second, j) => {
         if (i == j) { return; }
         if (first.last == second.first) {
            node.connections.push(j);
         }
      })
      songNodes.push(node);

   });
   return { songNodes, songsFirstAndLast };
}

function startWalkDepthFirst(songs, nodes, nodeIndex) {
   let visited = [];
   let output = [];
   let accumulator = [];
   return walkTreeDepthFirst(songs, nodes, nodeIndex, visited, output, accumulator);
}


function walkTreeDepthFirst(songs, nodes, nodeIndex, visited, output, accumulator) {
   if (visited[nodeIndex]) { return false; }
   visited[nodeIndex] = true;
   let visited2 = [...visited];
   let terminus = true;
   let accumulator2 = [...accumulator];
   accumulator2.push(songs[nodeIndex]);
   //   console.log(toString(accumulator2));

   nodes[nodeIndex].connections.forEach((nextIndex) => {
      if (visited[nextIndex]) { return false; }
      walkTreeDepthFirst(songs, nodes, nextIndex, visited2, output, accumulator2);
      terminus = false;
   });
   //   console.log(songs[nodeIndex]);
   if (terminus) {
      //      console.log("*****");
      output.push(accumulator2);
   }
   return output;
}



function getLongestPlaylist(songs, startingSong) {
   //   console.log("songs " + toString(songs));
   //   console.log("start " + toString(startingSong));
   console.log(`songlists for ${toString(songs)} starting with ${startingSong}\n`);

   let { songNodes, songsFirstAndLast } = getSongWordsNodes(songs);

   //   console.log("songNodes " + toString(songNodes));

   let startIndex = -1;
   let found = true;

   startIndex = songs.findIndex((song) => song === startingSong);
   if (startIndex == -1) {
      //the starting song is not in the list
      found = false;
      // find the song that does exist in the list, and use that as a starting point
      let { startingSongfirst, startingSongLast } = getSongFirstAndLast(startingSong);
      startIndex = songsFirstAndLast.findIndex(({ first, last }) => first === startingSongLast);
   }
   //   console.log("startIndex " + startIndex);
   if (startIndex == -1) {
      return [startingSong];
   }

   let playlists = startWalkDepthFirst(songs, songNodes, startIndex);
   console.log(toString(playlists));
   let longestPlaylistIndexes = [];
   let longestPlaylist = -1;

   playlists.forEach((songs, index) => {
      if (longestPlaylist < songs.length) {
         longestPlaylistIndexes = [index];
         longestPlaylist = songs.length;
      }
      else if (longestPlaylist == songs.length) {
         longestPlaylistIndexes.push(index);
      }
   });
   let output = [];
   longestPlaylistIndexes.forEach((longestPlaylistIndex) => {
      console.log(`the longest playlist is number ${longestPlaylistIndex + 1} at ${longestPlaylist} songs long:`);
      output.push(playlists[longestPlaylistIndex]);
   });
   return output;
}


function testRadioLongestPlaylist() {
   console.log("\n--------------\n");
   console.log("\ntestRadioLongestPlaylist\n");


   let playlist;
   playlist = getLongestPlaylist(songs1, song1_1);
   console.log(toString(playlist));
   console.log("\n--------------\n");

   playlist = getLongestPlaylist(songs1, song1_2);
   console.log(toString(playlist));
   console.log("\n--------------\n");


   playlist = getLongestPlaylist(songs1, song1_3);
   console.log(toString(playlist));
   console.log("\n--------------\n");

   playlist = getLongestPlaylist(songs2, song2_1);
   console.log(toString(playlist));
   console.log("\n--------------\n");

   playlist = getLongestPlaylist(songs2, song2_2);
   console.log(toString(playlist));
   console.log("\n--------------\n");

   playlist = getLongestPlaylist(songs3, song3_1);
   console.log(toString(playlist));
   console.log("\n--------------\n");

   playlist = getLongestPlaylist(songs4, song3_1);
   console.log(toString(playlist));
   console.log("\n--------------\n");
};
// breadth first delivers the results in order sorted by length
function walkBreadthFirst(songs, nodes, nodeIndex) {
   let queue = [];
   let output = [];
   queue.push({ index: nodeIndex, state: [] });

   while (queue.length) {
      let node = queue.shift();
      let visit = node.index;
      let state = node.state;
      let terminus = true;

      //      console.log("visit:" + visit);
      state.push(visit);
      //      console.log("state:" + state);
      nodes[visit].connections.forEach((nextIndex) => {
         if (state.includes(nextIndex)) { return false; }
         terminus = false;
         let currentState = [...state];
         queue.push({ index: nextIndex, state: currentState });
      });
      if (terminus) {
         let songList = [];
         state.forEach((songIndex) => {
            songList.push(songs[songIndex]);
         });
         output.push(songList);
      }
   }
   return output;
}
function getShortestPlaylist(songs, startingSong) {
   //   console.log("songs " + toString(songs));
   //   console.log("start " + toString(startingSong));
   console.log(`songlists for ${toString(songs)} starting with ${startingSong}\n`);

   let { songNodes, songsFirstAndLast } = getSongWordsNodes(songs);

   //   console.log("songNodes " + toString(songNodes));

   let startIndex = -1;
   let found = true;

   startIndex = songs.findIndex((song) => song === startingSong);
   if (startIndex == -1) {
      //the starting song is not in the list
      found = false;
      // find the song that does exist in the list, and use that as a starting point
      let { startingSongfirst, startingSongLast } = getSongFirstAndLast(startingSong);
      startIndex = songsFirstAndLast.findIndex(({ first, last }) => first === startingSongLast);
   }
   //   console.log("startIndex " + startIndex);
   if (startIndex == -1) {
      return [startingSong];
   }

   let playlists = walkBreadthFirst(songs, songNodes, startIndex);
   console.log(toString(playlists));

   let shortestPlaylistIndexes = [0];
   let shortestPlaylist = playlists[0].length;
   playlists.forEach((songs, index) => {
      console.log(`playlist number ${index + 1} is ${songs.length} songs long:`);

      if (index == 0) { return; }
      if (shortestPlaylist > songs.length) {
         shortestPlaylistIndexes = [index];
         shortestPlaylist = songs.length;
      }
      else if (shortestPlaylist == songs.length) {
         shortestPlaylistIndexes.push(index);
      }
   });
   let output = [];
   shortestPlaylistIndexes.forEach((shortestPlaylistIndex) => {
      console.log(`the shortest playlist is number ${shortestPlaylistIndex + 1} at ${shortestPlaylist} songs long:`);
      output.push(playlists[shortestPlaylistIndex]);
   });
   return output;
}
function testRadioShortestPlaylist() {
   console.log("\n--------------\n");
   console.log("\ntestRadioShortestPlaylist\n");

   let playlist = getShortestPlaylist(songs1, song1_1);
   console.log(toString(playlist));
   console.log("\n--------------\n");

   playlist = getShortestPlaylist(songs1, song1_2);
   console.log(toString(playlist));
   console.log("\n--------------\n");


   playlist = getShortestPlaylist(songs1, song1_3);
   console.log(toString(playlist));
   console.log("\n--------------\n");

   playlist = getShortestPlaylist(songs2, song2_1);
   console.log(toString(playlist));
   console.log("\n--------------\n");

   playlist = getShortestPlaylist(songs2, song2_2);
   console.log(toString(playlist));
   console.log("\n--------------\n");

   playlist = getShortestPlaylist(songs3, song3_1);
   console.log(toString(playlist));
   console.log("\n--------------\n");


   playlist = getShortestPlaylist(songs4, song3_1);
   console.log(toString(playlist));
   console.log("\n--------------\n");
};

// ===================================================================================
function lookAndSaySequence(sequence) {

   sequence = "" + sequence;
   let n = sequence.length;
   let seqArray = sequence.split("");
   let i = 0;
   let current = seqArray[i];
   let retVal = "";
   let count = 1;
   while (i < n) {
      i++;
      if ((i==n) || (seqArray[i] != current)) {
         retVal += count;
         retVal += current;
         if (i != n) {
            current = seqArray[i];
         }
         count = 1;
      } else {
         count++;
      }
   }
   return retVal;

}

function lookAndSay(sequenceInput, count = 10) {
   let sequenceNumber = Number(sequenceInput);
   console.log(typeof sequenceNumber);
   if (isNaN( sequenceNumber)) {
      console.log( "not a number" );
      return;
   }
   console.log("starts with ", sequenceInput);

   for (let i = 0; i < count; i++) {
      sequenceInput = lookAndSaySequence(sequenceInput)
      console.log(sequenceInput);

   }

}

function testLookAndSay() {
   lookAndSay("1");
   lookAndSay("111111111");
   lookAndSay("22");
   lookAndSay("hello");
}



// ===================================================================================


function walkSpiralArray(dimension) {

   // filled with zeroes
   let a = Array(dimension).fill(0).map(x => Array(dimension).fill(0));

   // walk around the spiral incrementing count
   let dx = [1, 0, -1, 0];
   let dy = [0, 1, 0, -1];
   let p;
   let q;
   let dir = 0;
   let x = 0;
   let y = 0;
   let maximum = a.length * a.length;
   let count = 0;
   while (count < maximum) { // stop when the highest number is reached
      count++;
      a[x][y] = count;
      p = x;
      q = y;
      x += dx[dir];
      y += dy[dir];
      if ((x < 0) ||
         (y < 0) ||
         (x >= a.length) ||
         (y >= a.length) ||
         (a[x][y] != 0)) {
         // go in a different direction
         dir++;
         if (dir >= 4) {
            dir = 0;
         }
         x = p + dx[dir];
         y = q + dy[dir];
      }
   }
   return a;
}



function spiralArray(dimension) {

   if (dimension <= 0) {
      console.error(`illegal dimension ${dimension}`);
      return;
   }
   return walkSpiralArray(dimension);

}



function testSpiralArray() {

   let a = spiralArray(2);
   console.log(a);
   a = spiralArray(1);
   console.log(a);
   a = spiralArray(8);
   console.log(a);
   a = spiralArray(0);
   console.log(a);
   a = spiralArray(-1);
   console.log(a);

}


// ===================================================================================

// ===================================================================================


function test() {
   console.log("hello, this is a test!");
   testSpiralArray();


//   testLookAndSay();
//   testBezier();
//   testRadioLongestPlaylist();
//   testRadioShortestPlaylist();
   console.log("tests are **DONE**!");

}

module.exports = test;