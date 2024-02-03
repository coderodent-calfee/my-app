var Shader = new (require("../Shader/Shader.js").Shader)();

var twgl = require("twgl.js");
const m4 = { ...twgl.m4, ...twgl.v3 };


// *** utility 
function toString(ob) {
   return JSON.stringify(ob, null, 2);
}
function isPowerOf2(value) {
   return (value & (value - 1)) === 0;
}
function get2d(array2d, x, y) {
   return array2d[x]?.[y];
}
function set2d(array2d, x, y, data) {
   if (array2d[x] === undefined) {
      array2d[x] = [];
   }
   array2d[x][y] = data;
}

function makeIndexedIndicesFn(arrays) {
   const indices = arrays.indices;
   let ndx = 0;
   const fn = function () {
      return indices[ndx++];
   };
   fn.reset = function () {
      ndx = 0;
   };
   fn.numElements = indices.length;
   return fn;
}

function makeUnindexedIndicesFn(arrays) {
   let ndx = 0;
   const fn = function () {
      return ndx++;
   };
   fn.reset = function () {
      ndx = 0;
   }
   fn.numElements = arrays.positions.length / 3;
   return fn;
}

function makeIndiceIterator(arrays) {
   return arrays.indices
      ? makeIndexedIndicesFn(arrays)
      : makeUnindexedIndicesFn(arrays);
}

// private tileblock stuff

const TILE_BLOCK_SIZE = 10.0;

// camera stuff:

function getCameraDefaults() {
   const fov = Math.PI * 0.25;
   const near = 0.1;
   const far = 100;
   function cameraGetProjection(gl) {
      const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
      const projection = m4.perspective(fov, aspect, near, far);
      return projection;
   }
   let getProjection = cameraGetProjection;

   const eye = [0, 10, 25];
   const target = [0, 0, 0];
   const up = [0, 1, 0];
   const camera = m4.lookAt(eye, target, up);
   const view = m4.inverse(camera);

   function cameraGetModelView(tileBlockX, tileBlockY, angle) {
      // center map on selected tileblock
      let xoff = tileBlockX * -TILE_BLOCK_SIZE;
      let yoff = tileBlockY * -TILE_BLOCK_SIZE;
      const rotatedView = m4.rotateY(view, angle);
      const modelView = m4.translate(rotatedView, [xoff, 0, yoff]);
      return modelView;
   }

   let getModelView = cameraGetModelView;
   return { fov, near, far, getProjection, eye, target, up, camera, view, getModelView };
}


// end camera stuff:


// draw highlight
//            highLightSquares = false;
function tileBlockDrawHightLight(ctx, projection, tileBlock, tileCount) {
   const gl = ctx.gl;
   let shader = ctx.shaders[ctx.currentShader];
   const programInfo = shader.programInfo;
   let u_color = tileBlock.highLightColor;
   let modelView = tileBlock.modelView;
   twgl.setUniforms(programInfo, {
      projection,
      modelView,
      u_color
   });
   // calls gl.drawArrays or gl.drawElements
   // Todo: build my own edgelist for highlight
   twgl.drawBufferInfo(gl, tileBlock.bufferInfo, gl.TRIANGLES, 12, 24 * tileCount);
}
//draw tileblock
function tileBlockDraw(ctx, projection, tileBlock) {
   const gl = ctx.gl;
   let shader = ctx.shaders[ctx.currentShader];
   const programInfo = shader.programInfo;
   let u_color = tileBlock.blockColor;
   let modelView = tileBlock.modelView;
   twgl.setUniforms(programInfo, {
      projection,
      modelView,
      u_color
   });
   twgl.drawBufferInfo(gl, tileBlock.bufferInfo);
}


function getModelView(tileBlockX, tileBlockY, angle) {
   const eye = [0, 10, 25];
   const target = [0, 0, 0];
   const up = [0, 1, 0];
   const camera = m4.lookAt(eye, target, up);
   const view = m4.inverse(camera);
   // center map on selected tileblock
   let xoff = tileBlockX * -TILE_BLOCK_SIZE;
   let yoff = tileBlockY * -TILE_BLOCK_SIZE;
   const rotatedView = m4.rotateY(view, angle);

   const modelView = m4.translate(rotatedView, [xoff, 0, yoff]);
   return modelView;
}


// setup model View transform
function tileBlockSetupModelView(view, time, tileBlock, ctx) {
   // model view includes translation and rotation of this tileblock
   let modelView = view;
   //modelView = m4.rotateY(modelView, time);
   let width = TILE_BLOCK_SIZE;
   let height = TILE_BLOCK_SIZE;
   //let width = tileBlock.width;
   //let height = tileBlock.height;
   // center full map
   //let xoff = ctx.mapInfo.width * width / -2;
   //let yoff = ctx.mapInfo.height * height / -2;

   //modelView = m4.translate(modelView, [xoff, 0, yoff]);
   //xoff = Math.sin(time);
   //yoff = Math.cos(time);
   //modelView = m4.translate(modelView, [xoff * width, 0, 0]);
   modelView = m4.translate(modelView, [width * tileBlock.x, 0, height * tileBlock.y]);
   tileBlock.modelView = modelView;
}

//todo: this awful routine needs tough love
function generateNormals(arrays, maxAngle) {
   const positions = arrays.position;
   const texcoords = arrays.texcoord;

   // first compute the normal of each face
   let getNextIndex = makeIndiceIterator(arrays);
   const numFaceVerts = getNextIndex.numElements;
   const numVerts = arrays.position.length;
   const numFaces = numFaceVerts / 3;
   const faceNormals = [];

   // Compute the normal for every face.
   // While doing that, create a new vertex for every face vertex
   for (let i = 0; i < numFaces; ++i) {
      const n1 = getNextIndex() * 3;
      const n2 = getNextIndex() * 3;
      const n3 = getNextIndex() * 3;

      const v1 = positions.slice(n1, n1 + 3);
      const v2 = positions.slice(n2, n2 + 3);
      const v3 = positions.slice(n3, n3 + 3);

      faceNormals.push(m4.normalize(m4.cross(m4.subtract(v1, v2), m4.subtract(v3, v2))));
   }

   let tempVerts = {};
   let tempVertNdx = 0;

   // this assumes vertex positions are an exact match

   function getVertIndex(x, y, z) {

      const vertId = x + "," + y + "," + z;
      const ndx = tempVerts[vertId];
      if (ndx !== undefined) {
         return ndx;
      }
      const newNdx = tempVertNdx++;
      tempVerts[vertId] = newNdx;
      return newNdx;
   }

   // We need to figure out the shared vertices.
   // It's not as simple as looking at the faces (triangles)
   // because for example if we have a standard cylinder
   //
   //
   //      3-4
   //     /   \
   //    2     5   Looking down a cylinder starting at S
   //    |     |   and going around to E, E and S are not
   //    1     6   the same vertex in the data we have
   //     \   /    as they don't share UV coords.
   //      S/E
   //
   // the vertices at the start and end do not share vertices
   // since they have different UVs but if you don't consider
   // them to share vertices they will get the wrong normals

   const vertIndices = [];
   for (let i = 0; i < numVerts; ++i) {
      const offset = i * 3;
      const vert = positions.slice(offset, offset + 3);
      vertIndices.push(getVertIndex(vert));
   }

   // go through every vertex and record which faces it's on
   const vertFaces = [];
   getNextIndex.reset();
   for (let i = 0; i < numFaces; ++i) {
      for (let j = 0; j < 3; ++j) {
         const ndx = getNextIndex();
         const sharedNdx = vertIndices[ndx];
         let faces = vertFaces[sharedNdx];
         if (!faces) {
            faces = [];
            vertFaces[sharedNdx] = faces;
         }
         faces.push(i);
      }
   }

   // now go through every face and compute the normals for each
   // vertex of the face. Only include faces that aren't more than
   // maxAngle different. Add the result to arrays of newPositions,
   // newTexcoords and newNormals, discarding any vertices that
   // are the same.
   tempVerts = {};
   tempVertNdx = 0;
   const newPositions = [];
   const newTexcoords = [];
   const newNormals = [];

   function getNewVertIndex(x, y, z, nx, ny, nz, u, v) {
      const vertId =
         x + "," + y + "," + z + "," +
         nx + "," + ny + "," + nz + "," +
         u + "," + v;

      const ndx = tempVerts[vertId];
      if (ndx !== undefined) {
         return ndx;
      }
      const newNdx = tempVertNdx++;
      tempVerts[vertId] = newNdx;
      newPositions.push(x, y, z);
      newNormals.push(nx, ny, nz);
      newTexcoords.push(u, v);
      return newNdx;
   }

   const newVertIndices = [];
   getNextIndex.reset();
   const maxAngleCos = Math.cos(maxAngle);
   // for each face
   for (let i = 0; i < numFaces; ++i) {
      // get the normal for this face
      const thisFaceNormal = faceNormals[i];
      // for each vertex on the face
      for (let j = 0; j < 3; ++j) {
         const ndx = getNextIndex();
         const sharedNdx = vertIndices[ndx];
         const faces = vertFaces[sharedNdx];
         const norm = [0, 0, 0];
         faces.forEach(faceNdx => {
            // is this face facing the same way
            const otherFaceNormal = faceNormals[faceNdx];
            const dot = m4.dot(thisFaceNormal, otherFaceNormal);
            if (dot > maxAngleCos) {
               m4.add(norm, otherFaceNormal, norm);
            }
         });
         m4.normalize(norm, norm);
         const poffset = ndx * 3;
         const toffset = ndx * 2;
         newVertIndices.push(getNewVertIndex(
            positions[poffset + 0], positions[poffset + 1], positions[poffset + 2],
            norm[0], norm[1], norm[2],
            texcoords[toffset + 0], texcoords[toffset + 1]));
      }
   }

   return {
      position: newPositions,
      texcoord: newTexcoords,
      normal: newNormals,
      indices: newVertIndices,
   };

}



         //      0----1
         //      |\A /|
         //      | \/4|
         //      |B/\D|
         //      |/C \|
         //      2----3 
function getIndexOrder(offset) {
   const indices = [
      0, 4, 1, // triangle A
      0, 2, 4, // triangle B
      2, 3, 4, // triangle C
      1, 4, 3  // triangle D
   ];
   return indices.map(x => x + offset);
}

function buildTileBlockArraysFrom2dArray(heightMap2dArray) {

   const maxHeight = 1.0;
   const cellsAcross = heightMap2dArray.length - 1;
   const cellsDeep = cellsAcross;

   function getHeight(offset) {
      let x = offset[0];
      let z = offset[1];
      //return x * 0.3 + z * 0.5;
      const v = heightMap2dArray[x]?.[z];
      if (v === undefined) { return -1; } // -1 as a flag is not the best as it sill makes a heavy normals shift
      return v * maxHeight / 255.0; // 0 to 10
   }

   const positions = [];
   const texcoords = [];
   const indices = [];
   let delta = TILE_BLOCK_SIZE / heightMap2dArray.length;
   //let delta = 1.0;
   // make some vertex data
   for (let z = 0; z <= cellsDeep; ++z) {
      for (let x = 0; x <= cellsAcross; ++x) {
         //const base0 = [x,z];
         //const base1 = [x,z+1];

         const h00 = getHeight([x, z]);            // 00---01
         const h01 = getHeight([x + 1, z]);        // |  .  | 
         const h10 = getHeight([x, z + 1]);        // |     | 
         const h11 = getHeight([x + 1, z + 1]);    // 10---11 

         //const h00 = getHeight([x, z]);
         //const h01 = h00;
         //const h10 = h00;
         //const h11 = h00;
         const hm = (h00 + h01 + h10 + h11) / 4;

         const x0 = x * delta;
         const x1 = (x + 1) * delta;
         const z0 = z * delta;
         const z1 = (z + 1) * delta;

         const ndx = positions.length / 3;
         positions.push(
            x0, h00, z0,
            x1, h01, z0,
            x0, h10, z1,
            x1, h11, z1,
            (x0 + x1) / 2, hm, (z0 + z1) / 2,
         );
         const u0 = x / cellsAcross;
         const v0 = z / cellsDeep;
         const u1 = (x + 1) / cellsAcross;
         const v1 = (z + 1) / cellsDeep;
         texcoords.push(
            u0, v0,
            u1, v0,
            u0, v1,
            u1, v1,
            (u0 + u1) / 2, (v0 + v1) / 2,
         );
         //         
         //      0----1 
         //      |\  /|
         //      | \/4|
         //      | /\ |
         //      |/  \|
         //      2----3 

         indices.push(...getIndexOrder(ndx));

      }
   }

   // maxAngle parameter?
   //const maxAngle = 2 * Math.PI / 180;  // make them faceted
   const maxAngle = 2 * Math.PI / 3;  // make them smooth
   const arrays = generateNormals({
      position: positions,
      texcoord: texcoords,
      indices,
   }, maxAngle);
   return arrays;
}

function createHeightMapArrayFromImageData(imageData) {
   if (imageData.width != imageData.height) {
      console.warn("height map not square!");
   }
   let size = 4;   // RGBA
   let offset = 0; // R
   let map = Array(imageData.width).fill(0).map((zero, index) => {
      let start = index * imageData.width * size + offset;
      let end = (index + 1) * imageData.width * size + offset;
      return imageData.data.slice(start, end).reduce((total, currentValue, currentIndex, arr) => {
         if (currentIndex == 1) {
            return [total];
         }
         else if (currentIndex % 4) {
            return total;
         }
         else {
            total.push(currentValue);
            return total;
         }
         //         console.log(`reduce ${total}, ${currentValue}, ${currentIndex}`);
      });
   });
   return map;
}

function getTileBlockFromHeightMap(gl, heightMapData, textureMapData, debug) {
   let tileBlock = {
      highLightColor: [0.0, 0.0, 1.0],
      blockColor: [1.0, 1.0, 1.0],
      texture: textureMapData.imgElement,
      textureMapData: textureMapData.imageData,
      heightMap: heightMapData.imgElement,
      heightMapData: heightMapData.imageData,
   };
   let heightMap2dArray = createHeightMapArrayFromImageData(tileBlock.heightMapData);
   tileBlock.width = heightMap2dArray.length;
   tileBlock.height = heightMap2dArray[0].length;
   if (debug) {

      set2d(heightMap2dArray, tileBlock.width / 2, tileBlock.height / 2, debug + get2d(heightMap2dArray, tileBlock.width / 2, tileBlock.height / 2));

   }


   heightMap2dArray[tileBlock.width / 2]
   let arrays = buildTileBlockArraysFrom2dArray(heightMap2dArray);
   tileBlock.arrays = arrays;


   let u_texture = gl.createTexture();
   tileBlock.u_texture = u_texture;
   // calls gl.createBuffer, gl.bindBuffer, gl.bufferData for each array
   const bufferInfo = twgl.createBufferInfoFromArrays(gl, arrays);
   tileBlock.bufferInfo = bufferInfo;
   return tileBlock;
}
function createTileBlock(tileBlockDefinition) {
   return Promise.all([
      Shader.promisedImageData(tileBlockDefinition.heightMapName),
      Shader.promisedImageData(tileBlockDefinition.textureMapName),
      tileBlockDefinition]);
}

function createTileBlocks_(tileBlockDefinitions, gl, addTileBlock) {
   let tileBlockPromises = [];
   tileBlockDefinitions.forEach((tileBlockDefinition) => {
      let tileBlockPromise = createTileBlock(tileBlockDefinition).then(([heightMapData, textureMapData, tileBlockDef]) => {
         let tb = getTileBlockFromHeightMap(gl, heightMapData, textureMapData, tileBlockDef.x * 3 + tileBlockDef.y * 5);
         tb.x = tileBlockDef.x;
         tb.y = tileBlockDef.y;
         addTileBlock(tb);
         return tb;
      });

      tileBlockPromises.push(tileBlockPromise);
   });
   return Promise.all(tileBlockPromises);
}


function tileBlockSetupRender(ctx, tileBlock)
// setup tileblock texture to render
{
   const gl = ctx.gl;
   gl.bindTexture(gl.TEXTURE_2D, tileBlock.u_texture);
   let image = tileBlock.texture;
   gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
   // Check if the image is a power of 2 in both dimensions.
   if (isPowerOf2(image.width) && isPowerOf2(image.height)) {
      // Yes, it's a power of 2. Generate mips.
      gl.generateMipmap(gl.TEXTURE_2D);
   } else {
      // No, it's not a power of 2. Turn off mips and set wrapping to clamp to edge
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
   }
}

function getTileIndices(tileBlock, x, z) {
   let tileStartIndex = (x + (z * tileBlock.width)) * 12;
   return tileBlock.arrays.indices.slice(tileStartIndex, tileStartIndex + 12);
}

// todo: fixups need to adjust the normals as well

function fixupTileBlockVertical(gl, from, to) {
   //      | \/4|
   //      | /\ |
   //      |/  \|
   //      2----3  To
   //      0----1  From
   //      |\  /|
   // for each tile along the border
   // take the top two positions of 'from' and place them into the bottom two positions of 'to'
   const f = from.arrays.position;
   const t = to.arrays.position;
   for (let x = 0; x < from.width; x++) {
      let [toIndex0, toIndex4, toIndex1, toIndex0b, toIndex2, toIndex4b, toIndex2b, toIndex3] = getTileIndices(to, x, to.height - 1).map(i => (i * 3) + 1);
      let [fromIndex0, fromIndex4, fromIndex1, fromIndex0b, fromIndex2, fromIndex4b, fromIndex2b, fromIndex3] = getTileIndices(from, x, 0).map(i => (i * 3) + 1);
      t[toIndex2] = f[fromIndex0];
      if (f[fromIndex1] != -1) {
         t[toIndex3] = f[fromIndex1];
      }
      // fixup the 'to' midpoint
      t[toIndex4] = (t[toIndex0] + t[toIndex1] + t[toIndex2] + t[toIndex3]) / 4;
      // for now letting the normals lay there
   }

   // positions of the tile were changed; need to update the buffer
   twgl.setAttribInfoBufferFromArray(gl, to.bufferInfo.attribs.position, to.arrays.position);
}

function fixupTileBlockHorizontal(gl, from, to) {
   //          To From
   //      0----1 0----1
   //      |\  /| |\  /|
   //      | \/4| | \/4|
   //      | /\ | | /\ |
   //      |/  \| |/  \|
   //      2----3 2----3
   // for each tile along the border
   // take the left two positions of 'from' and place them into the right two positions of 'to'
   let f = from.arrays.position;
   let t = to.arrays.position;
   for (let z = 0; z < from.height; z++) {
      let [toIndex0, toIndex4, toIndex1, toIndex0b, toIndex2, toIndex4b, toIndex2b, toIndex3] = getTileIndices(to, to.width - 1, z).map(i => (i * 3) + 1);
      let [fromIndex0, fromIndex4, fromIndex1, fromIndex0b, fromIndex2, fromIndex4b, fromIndex2b, fromIndex3] = getTileIndices(from, 0, z).map(i => (i * 3) + 1);
      t[toIndex1] = f[fromIndex0];
      if (f[fromIndex2] != -1) {
         t[toIndex3] = f[fromIndex2];
      }
      // fixup the 'to' midpoint
      t[toIndex4] = (t[toIndex0] + t[toIndex1] + t[toIndex2] + t[toIndex3]) / 4;
      // for now letting the normals lay there
   }

   // positions of the tile were changed; need to update the buffer
   twgl.setAttribInfoBufferFromArray(gl, to.bufferInfo.attribs.position, to.arrays.position);
}

function fixupTileBlockCorner(gl, from, to) {
   //      | \/4| | \/4|
   //      | /\ | | /\ |
   //      |/  \| |/  \|
   //   To 2----3 2----3 
   //      0----1 0----1 From
   //      |\  /| |\  /|
   let f = from.arrays.position;
   let t = to.arrays.position;

   let [toIndex0, toIndex4, toIndex1, toIndex0b, toIndex2, toIndex4b, toIndex2b, toIndex3] = getTileIndices(to, to.width - 1, to.height - 1).map(i => (i * 3) + 1);
   let [fromIndex0, fromIndex4, fromIndex1, fromIndex0b, fromIndex2, fromIndex4b, fromIndex2b, fromIndex3] = getTileIndices(from, 0, 0).map(i => (i * 3) + 1);

   t[toIndex3] = f[fromIndex0];
   t[toIndex4] = (t[toIndex0] + t[toIndex1] + t[toIndex2] + t[toIndex3]) / 4;
   // for now letting the normals lay there

   // positions of the tile were changed; need to update the buffer
   twgl.setAttribInfoBufferFromArray(gl, to.bufferInfo.attribs.position, to.arrays.position);
}


// public tileblock stuff
export class TileBlock {

   initialized_ = false;
   
   ctx = {
      shaders: {},
      tileBlocks: [],
      mapInfo: { width: 7, height: 7 },
      camera: {
      }
   };

   initialize(canvas, heightMapName, textureMapName, width, height) {
      if (this.initialized_) { return; }
      let ctx = this.ctx;
      ctx.gl = Shader.initGl(canvas);
      [ctx.currentShader, ctx.shaders[ctx.currentShader]] = Shader.initShader(ctx.gl, "grid2");
      ctx.currentShaderProgram = "";
      this.createTileBlocks(heightMapName, textureMapName, width, height); 
      ctx.camera = getCameraDefaults();
      this.initialized_ = true;
   }

   createTileBlockDefinitions(heightMapName, textureMapName, width, height) {
      let tileBlockDefinitions = [];

      for (let x = 0; x < width; x++) {
         for (let y = 0; y < height; y++) {
            let tileBlockDefinition = {
               heightMapName: heightMapName,
               textureMapName: textureMapName,
               x: x, y: y
            };

            tileBlockDefinitions.push(tileBlockDefinition);
         }
      }
      return tileBlockDefinitions;
   }

   createTileBlocks(heightMapName, textureMapName, width, height) {
      let ctx = this.ctx;

      let tileBlockDefinitions = this.createTileBlockDefinitions(heightMapName, textureMapName, width, height);

      // todo move to its own function for readability
      // let f = function.bind(this, arg1, arg2, arg3)
      // f(arg4, arg5)
      function addTileBlock(tb) {
         console.log(`add tile block ${tb.x},${tb.y}`);

         if (tb.x == 3 && tb.y == 3) {
            tb.highLightSquares = [[0, 0]];
         }
         set2d(ctx.tileBlocks, tb.x, tb.y, tb);

         let above = get2d(ctx.tileBlocks, tb.x, tb.y - 1);
         if (above) {
            fixupTileBlockVertical(ctx.gl, tb, above);
         }
         let below = get2d(ctx.tileBlocks, tb.x, tb.y + 1);
         if (below) {
            fixupTileBlockVertical(ctx.gl, below, tb);
         }
         let left = get2d(ctx.tileBlocks, tb.x - 1, tb.y);
         if (left) {
            fixupTileBlockHorizontal(ctx.gl, tb, left);
         }
         let right = get2d(ctx.tileBlocks, tb.x + 1, tb.y);
         if (right) {
            fixupTileBlockHorizontal(ctx.gl, right, tb);
         }

         let corner = get2d(ctx.tileBlocks, tb.x - 1, tb.y - 1);
         if (corner) {
            console.log(`fixup corner a ${corner.x},${corner.y} with ${tb.x},${tb.y}`);

            fixupTileBlockCorner(ctx.gl, tb, corner);
         }
         corner = get2d(ctx.tileBlocks, tb.x + 1, tb.y + 1);
         if (corner) {
            console.log(`fixup corner b  ${tb.x},${tb.y} with ${corner.x},${corner.y}`);
            fixupTileBlockCorner(ctx.gl, corner, tb);
         }
      }


      createTileBlocks_(tileBlockDefinitions, ctx.gl, addTileBlock).then(() => {
         console.log("all tileblocks loaded"); // informational only; no real use for  promise all
      }).catch((error) => {
         console.log("tileblocks error", error);
      });
   }

   renderStart() {
      let ctx = this.ctx;
      // allow view to change (ground-level/top-down)
      let oldHighlight;
      let tileCount = 0;
      let tileBlockX = ctx.mapInfo.width / 2;
      let tileBlockY = ctx.mapInfo.height / 2;
      function render(time) {

         let highLightTimer = (Math.round(time / 500) % 2); // works as a 1/2 second flash
         if (oldHighlight != highLightTimer) {
            oldHighlight = highLightTimer;
            if (highLightTimer) {
               tileCount++;
               tileBlockX++;
               if (tileBlockX >= ctx.mapInfo.width) {
                  tileBlockX = 0;
                  tileBlockY++;
               }
               if (tileBlockY >= ctx.mapInfo.height) {
                  tileBlockY = 0;

               }

            }
            if (tileCount > 15) {
               tileCount = 0;
            }
         }
         let camera = ctx.camera;
         let rotationAngle = 0;
         // rotationAngle = time * 0.0005 // causes the object of interes to rotate under our gaze
         const view = camera.getModelView(tileBlockX, tileBlockY, rotationAngle);

         const gl = ctx.gl;

         // we do this every frame to ensure response to resizing the window
         twgl.resizeCanvasToDisplaySize(gl.canvas);
         // allow projection type to change (fov/ortho)
         const projection = camera.getProjection(ctx.gl); // as client size changes so may this (must be in render, and after resize)
         gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);


         //// set shader depending on the draw info we want
         //let shader = ctx.shaders[ctx.currentShader];
         //const programInfo = shader.programInfo;
         //// these should depend on the shader
         //gl.enable(gl.DEPTH_TEST);
         //gl.enable(gl.CULL_FACE);

         Shader.useProgramEnables(ctx);

         ctx.tileBlocks.forEach((tileBlockRow) => {
            if (!tileBlockRow) {
               return;
            }
            tileBlockRow.forEach((tileBlock) => {
               if (!tileBlock) {
                  return;
               }
               tileBlockSetupRender(ctx, tileBlock);

               // setup model View transform
               tileBlockSetupModelView(view, time * 0.0005, tileBlock, ctx);

               // calls gl.bindBuffer, gl.enableVertexAttribArray, gl.vertexAttribPointer
               // for drawing this tileblock
               const programInfo = ctx.shaders[ctx.currentShader].programInfo;
               twgl.setBuffersAndAttributes(gl, programInfo, tileBlock.bufferInfo);

               // the tileblocks all use the same shader program for now, so this could be outside the loop
               Shader.useProgram(ctx);

               // draw highlight
               if (highLightTimer && tileBlock.highLightSquares) {
                  tileBlockDrawHightLight(ctx, projection, tileBlock, tileCount);
               }
               //draw tileblock
               tileBlockDraw(ctx, projection, tileBlock);
            });
         });

         requestAnimationFrame(render);
      }
      requestAnimationFrame(render);

   }
}

