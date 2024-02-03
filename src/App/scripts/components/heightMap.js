import * as THREE from "three";
import React, { useRef, Suspense, useState, useEffect } from "react";
import { Canvas, extend, useFrame, useLoader } from "@react-three/fiber";
import { shaderMaterial } from "@react-three/drei";
import { shaderManifest } from "../../shaders/manifest";

var twgl = require("twgl.js");
//var tb = require("../TileBlock/TileBlock.js");
var TileBlock = new (require("../TileBlock/TileBlock.js").TileBlock)();

const m4 = { ...twgl.m4, ...twgl.v3 };

"use strict";

const TILE_BLOCK_SIZE = 10.0;

/// NOTE: twgl setBuffersAndAttributes for drawing
/// createBufferInfoFromArrays to initialze data buffers on construction
/// see: setAttribInfoBufferFromArray for dynamic updating
/// https://twgljs.org/docs/module-twgl.html#.setAttribInfoBufferFromArray

// *** utility boilerplate


function isPowerOf2(value) {
   return (value & (value - 1)) === 0;
}



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


function resizeCanvasToDisplaySize(canvas) {
   // Lookup the size the browser is displaying the canvas in CSS pixels.
   const displayWidth = canvas.clientWidth;
   const displayHeight = canvas.clientHeight;

   // Check if the canvas is not the same size.
   const needResize = canvas.width !== displayWidth ||
      canvas.height !== displayHeight;

   if (needResize) {
      // Make the canvas the same size
      canvas.width = displayWidth;
      canvas.height = displayHeight;
   }
   return needResize;
}

//function initGl(canvas) {
//   return canvas.getContext("webgl");
//}

function initRenderProgram(gl, shaderName) {
   // Get the strings for our GLSL shaders
   const vs = require(`../../shaders/${shaderName}.vert`);
   const fs = require(`../../shaders/${shaderName}.frag`);
//   console.log("\nvertexShaderSource:\n" + vs);
//   console.log("\nfragmentShaderSource:\n" + fs);

   // create GLSL shaders, upload the GLSL source, compile the shaders
   const programInfo = twgl.createProgramInfo(gl, [vs, fs]);

   return programInfo;
}

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

function createHeightMapArrayFromImageData(imageData) {
   if (imageData.width != imageData.height) {
      console.warn("height map not square!");
   }
   let size = 4;   // RGBA
   let offset = 0; // R
   let map = Array(imageData.width).fill(0).map((zero, index) => {
      let start = index * imageData.width * size + offset;
      let end = (index+1) * imageData.width * size + offset;
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


function getImageData(imgElement) {
   // use a private canvas 2D to read the image
   const ctx = document.createElement('canvas').getContext('2d');
   ctx.canvas.width = imgElement.width;
   ctx.canvas.height = imgElement.height;
   ctx.drawImage(imgElement, 0, 0);
   const imageData = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height);

   return imageData;
}

function cameraGetProjection(gl) {
   const fov = Math.PI * 0.25;
   const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
   const near = 0.1;
   const far = 100;
   const projection = m4.perspective(fov, aspect, near, far);
   return projection;
}

//function getModelView(tileBlockX, tileBlockY, angle) {
//   const eye = [0, 10, 25];
//   const target = [0, 0, 0];
//   const up = [0, 1, 0];
//   const camera = m4.lookAt(eye, target, up);
//   const view = m4.inverse(camera);
//   // center map on selected tileblock
//   let xoff = tileBlockX * -TILE_BLOCK_SIZE;
//   let yoff = tileBlockY * -TILE_BLOCK_SIZE;
//   const rotatedView = m4.rotateY(view, angle);

//   const modelView = m4.translate(rotatedView, [xoff, 0, yoff]);
//   return modelView;
//}

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

// setup model View transform
function tileBlockSetupModelView(view, time, tileBlock, ctx)
{
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
function tileBlockDraw(ctx, projection, tileBlock)
{
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

function getTileBlockPositionsFromIndices(tileBlock, indices) {
   return indices.map(
      (index) => {
         return [
            tileBlock.arrays.position[3 * index],
            tileBlock.arrays.position[3 * index + 1],
            tileBlock.arrays.position[3 * index + 2]
         ];
   });
}


function getTileBlockPositions(tileBlock, x, z) {
   let twelvePositions = getTileBlockPositionsFromIndices(tileBlock, getTileIndices(tileBlock, x, z));
   // Index order:
   // 0, 4, 1,   0, 2, 4,  2, 3, 4,  1, 4, 3
   // 0  1  2    3  4  5   6  7
   //      0----1
   //      |\  /|
   //      | \/4|
   //      | /\ |
   //      |/  \|
   //      2----3
   return [
      twelvePositions[0],   // position 0
      twelvePositions[2],   // position 1
      twelvePositions[4],   // position 2
      twelvePositions[7],   // position 3
      twelvePositions[1],   // position 4
   ]
}




export default function HeightMap(props) {

   const ref = React.useRef(null);
   var ctx = TileBlock.ctx;


   useEffect(() => {
      TileBlock.initialize(ref.current, 'img/shader/heightmap-4x4.png', 'img/shader/256x256-lichen-moss.jpg', ctx.mapInfo.width, ctx.mapInfo.height);
      TileBlock.renderStart();
   }, []);



   return (
      <section id="shader">
         <div>
            <div className="view-container">
               <canvas ref={ref} id="c" className="shader-canvas"></canvas>
               <div className="shader-canvas-overlay">
                  <h2>select shader</h2>
               </div>               
            </div>
         </div>

      </section>
   );
};


// todo: next is to move the terrain to a selected point
// tile blocks are known w/h as TILE_BLOCK_SIZE
// so we can go to tile block x/y as 3.5/2.7 (tile block at 3/2 and 50% across and 70% up/down)
