import * as THREE from "three";
import React, { useRef, Suspense, useState, useEffect } from "react";
import { Canvas, extend, useFrame, useLoader } from "@react-three/fiber";
import { shaderMaterial } from "@react-three/drei";
import { shaderManifest } from "../../shaders/manifest";
import { M4 } from "../m4";

const m4 = new M4();

"use strict";


// *** utility boilerplate

function toString(ob) {
   return JSON.stringify(ob, null, 2);
}

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

function createShader(gl, type, source) {
   var shader = gl.createShader(type);
   gl.shaderSource(shader, source);
   gl.compileShader(shader);
   var success = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
   if (success) {
      return shader;
   }
   console.error("getShaderInfoLog:", gl.getShaderInfoLog(shader));
   gl.deleteShader(shader);
}

function createProgram(gl, vertexShader, fragmentShader) {
   var prg = gl.createProgram();
   gl.attachShader(prg, vertexShader);
   gl.attachShader(prg, fragmentShader);
   gl.linkProgram(prg);
   var success = gl.getProgramParameter(prg, gl.LINK_STATUS);
   if (success) {
      return prg;
   }
   console.error("gl.getProgramInfoLog:", gl.getProgramInfoLog(prg));
   gl.deleteProgram(prg);
}

function initRenderProgram(gl, shaderName) {
   // Get the strings for our GLSL shaders
   const vertexShaderSource = require(`../../shaders/${shaderName}.vert`);
   const fragmentShaderSource = require(`../../shaders/${shaderName}.frag`);
   console.log("\nvertexShaderSource:\n" + vertexShaderSource);
   console.log("\nfragmentShaderSource:\n" + fragmentShaderSource);

   // create GLSL shaders, upload the GLSL source, compile the shaders
   // TODO: error check if null is returned
   let vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
   let fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);

   // Link the two shaders into a program
   let program = createProgram(gl, vertexShader, fragmentShader);
   return program;
}

function initGl(canvas, path) {
   console.log("initGl");

   // initialization code.
   if (!canvas && path) {
      canvas = document.querySelector(path);
   }
   if (!canvas) {
      return null;
   }
   // Get A WebGL context
   let gl = canvas.getContext("webgl");
   if (!gl) {
      return null;
   }
   return gl;
}

function initProgramBuffers(gl, program) {
   console.log("initProgramBuffers");
   let positionBuffers = initPositionBuffers(gl, program);
   let textureBuffers = initTextureBuffers(gl, program);
   let uniforms = initUniforms(gl, program);

   let programBuffers = positionBuffers;
   programBuffers = { ...programBuffers, ...textureBuffers };
   programBuffers = { ...programBuffers, ...uniforms };

   return programBuffers;
}

function initRenderContext(canvas, shaderName) {
   //TODO: if GL is already gotten, how to add new shader programs
   // different function?
   console.log("initRenderContext");
   let gl = initGl(canvas);
   let program = initRenderProgram(gl, shaderName);
   let programBuffers = initProgramBuffers(gl, program);
   let shader = {};
   shader.name = shaderName;
   shader.program = program;
   shader = { ...shader, ...programBuffers }

   let textureInfo = initTextureInfo(gl);
   let drawInfo = initDrawInfo(gl, textureInfo);

   let shaders = {};
   shaders[shaderName] = shader;
   return {
      gl: gl,
      currentShader: shaderName,
      drawInfo: drawInfo,
      shaders: shaders
   };
}
// game logic
function initMap(ctx) {
// arbitrary map
   let maxIcon = 98;
   let mapData = [];
   let icon = 0;
   for (let j = 0; j < 7; j++) {
      mapData[j] = [];
      for (let i = 0; i < 14; i++) {
         mapData[j].push(icon); // map icon
         icon++;
         if (icon >= maxIcon) {
            break;
         }
      }
      if (icon >= maxIcon) {
         break;
      }
   }
 
   let icons = [];
   let iconSheet = ctx.drawInfo[0].textureInfo;
   let iconWidth = 0.079;
   let iconHeight = 0.125;
   let sheetXOffset = 0.024;
   let sheetOddXOffset = 0.027;
   let sheetYOffset = 0.078;
   let sheetOddYOffset = 0.130;
   let sheetXStride = 0.0644;
   let sheetYStride = 0.12;

   console.log(toString(iconSheet));
   let iconRow = 0;
   let iconColumn = 0;
   for (let i = 0; i < maxIcon; i++) {
      iconColumn = (i % 14);
      iconRow = Math.floor(i / 14);
      let drawInfo = {
         x: 0.0, // overwrite x/y with actual square location on map
         y: 0.0,
         dx: 0, // movement
         dy: 0,
         xScale: iconWidth, // scale up to map tile size
         yScale: iconHeight,
         offX: (iconColumn * sheetXStride) + ((iconColumn % 2) ? sheetOddXOffset : sheetXOffset),     // src texture offset
         offY: (iconRow *sheetYStride)+((i % 2) ? sheetOddYOffset : sheetYOffset),
         rotation: 0.0, // texture rotation
         deltaRotation: 0.0,
         width: iconWidth, // how much of texture width 1.0 == full texture
         height: iconHeight,
         textureInfo: iconSheet,
      };
      icons.push(drawInfo);

   }

   return {
      data: mapData,
      icons: icons,
   };
}


// depends on shader program

// Unlike images, textures do not have a width and height associated
// with them so we'll pass in the width and height of the texture
function drawImage(ctx,
   tex, texWidth, texHeight,
   srcX, srcY, srcWidth, srcHeight,
   dstX, dstY, dstWidth, dstHeight,
   srcRotation) {


   if (dstX === undefined) {
      dstX = srcX;
      srcX = 0;
   }
   if (dstY === undefined) {
      dstY = srcY;
      srcY = 0;
   }
   if (srcWidth === undefined) {
      srcWidth = texWidth;
   }
   if (srcHeight === undefined) {
      srcHeight = texHeight;
   }
   if (dstWidth === undefined) {
      dstWidth = srcWidth;
      srcWidth = texWidth;
   }
   if (dstHeight === undefined) {
      dstHeight = srcHeight;
      srcHeight = texHeight;
   }
   if (srcRotation === undefined) {
      srcRotation = 0;
   }

   let gl = ctx.gl;
   let shader = ctx.shaders[ctx.currentShader];

   gl.bindTexture(gl.TEXTURE_2D, tex);

   // Tell WebGL to use our shader program pair
   gl.useProgram(shader.program);

   // Setup the attributes to pull data from our buffers
   gl.bindBuffer(gl.ARRAY_BUFFER, shader.positionBuffer);
   gl.enableVertexAttribArray(shader.positionLocation);
   gl.vertexAttribPointer(shader.positionLocation, 2, gl.FLOAT, false, 0, 0);
   gl.bindBuffer(gl.ARRAY_BUFFER, shader.texcoordBuffer);
   gl.enableVertexAttribArray(shader.texcoordLocation);
   gl.vertexAttribPointer(shader.texcoordLocation, 2, gl.FLOAT, false, 0, 0);

   // this matrix will convert from pixels to clip space
   let matrix = m4.orthographic(0, gl.canvas.width, gl.canvas.height, 0, -1, 1);

   // this matrix will translate our quad to dstX, dstY
   matrix = m4.translate(matrix, dstX, dstY, 0);

   // this matrix will scale our 1 unit quad
   // from 1 unit to texWidth, texHeight units
   matrix = m4.scale(matrix, dstWidth, dstHeight, 1);

   // Set the matrix.
   gl.uniformMatrix4fv(shader.matrixLocation, false, matrix);

   // just like a 2d projection matrix except in texture space (0 to 1)
   // instead of clip space. This matrix puts us in pixel space.
   let texMatrix = m4.scaling(1 / texWidth, 1 / texHeight, 1);

   // We need to pick a place to rotate around
   // We'll move to the middle, rotate, then move back
   texMatrix = m4.translate(texMatrix, texWidth * 0.5, texHeight * 0.5, 0);
   texMatrix = m4.zRotate(texMatrix, srcRotation);
   texMatrix = m4.translate(texMatrix, texWidth * -0.5, texHeight * -0.5, 0);

   // because we're in pixel space
   // the scale and translation are now in pixels
   texMatrix = m4.translate(texMatrix, srcX, srcY, 0);
   texMatrix = m4.scale(texMatrix, srcWidth, srcHeight, 1);

   // Set the texture matrix.
   gl.uniformMatrix4fv(shader.textureMatrixLocation, false, texMatrix);

   // Tell the shader to get the texture from texture unit 0
   gl.uniform1i(shader.textureLocation, 0);

   // draw the quad (2 triangles, 6 vertices)
   gl.drawArrays(gl.TRIANGLES, 0, 6);
}

function draw(ctx) {
   let gl = ctx.gl;
   let drawInfos = ctx.drawInfo;

   resizeCanvasToDisplaySize(gl.canvas);

   // Tell WebGL how to convert from clip space to pixels
   gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

   gl.clear(gl.COLOR_BUFFER_BIT);

   drawInfos.forEach(function (drawInfo) {
      let dstX = drawInfo.x;
      let dstY = drawInfo.y;
      let dstWidth = drawInfo.textureInfo.width * drawInfo.xScale;
      let dstHeight = drawInfo.textureInfo.height * drawInfo.yScale;

      let srcX = drawInfo.textureInfo.width * drawInfo.offX;
      let srcY = drawInfo.textureInfo.height * drawInfo.offY;
      let srcWidth = drawInfo.textureInfo.width * drawInfo.width;
      let srcHeight = drawInfo.textureInfo.height * drawInfo.height;

      drawImage(ctx,
         drawInfo.textureInfo.texture,
         drawInfo.textureInfo.width,
         drawInfo.textureInfo.height,
         srcX, srcY, srcWidth, srcHeight,
         dstX, dstY, dstWidth, dstHeight,
         drawInfo.rotation);
   });
}

function loadMapIconSheet(ctx, url) {
   let gl = ctx.gl;
   let tex = gl.createTexture();
   gl.bindTexture(gl.TEXTURE_2D, tex);
   // Fill the texture with a 1x1 blue pixel.
   gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 255, 255]));

   // let's assume all images are not a power of 2
   gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
   gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
   gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);

   let textureInfo = {
      width: 1,   // we don't know the size until it loads
      height: 1,
      texture: tex,
   };
   let img = new Image();
   img.addEventListener('load', function () {
      textureInfo.width = img.width;
      textureInfo.height = img.height;
      console.log("loadMapIconSheet\n", toString(textureInfo));
      ctx.map = initMap(ctx);
      gl.bindTexture(gl.TEXTURE_2D, textureInfo.texture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
   });
   img.src = url;
   return textureInfo;
}

// creates a texture info { width: w, height: h, texture: tex }
// The texture will start with 1x1 pixels and be updated
// when the image has loaded

function loadImageAndCreateTextureInfo(gl, url) {
   let tex = gl.createTexture();
   gl.bindTexture(gl.TEXTURE_2D, tex);
   // Fill the texture with a 1x1 blue pixel.
   gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 255, 255]));

   // let's assume all images are not a power of 2
   gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
   gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
   gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);

   let textureInfo = {
      width: 1,   // we don't know the size until it loads
      height: 1,
      texture: tex,
   };
   let img = new Image();
   img.addEventListener('load', function () {
      textureInfo.width = img.width;
      textureInfo.height = img.height;
      gl.bindTexture(gl.TEXTURE_2D, textureInfo.texture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
   });
   img.src = url;
   return textureInfo;
}


function initTextureInfo(gl) {
   console.log("initTextureInfo");
   return [
      loadImageAndCreateTextureInfo(gl, 'img/shader/hex-icons-fantasy-map.png'),
   ];
}

function initDrawInfo(gl, textureInfos) {
   console.log("initDrawInfo");

   let drawInfos = [];
   let numToDraw = 1;

   

   let textureIndex;
   let random;
   for (let ii = 0; ii < numToDraw; ++ii) {
      if (ii < textureInfos.length) {
         textureIndex = ii;
      }
      else {
         random = Math.random();
         textureIndex = Math.floor(random * textureInfos.length) | 0;
      }

      let drawInfo = {
         x: gl.canvas.width / 2,
         y: 0.0,
         dx: 0,
         dy: 0,
         xScale: 1.0,
         yScale: 1.0,
         offX: 0,
         offY: 0,
         rotation: 0.0,
         deltaRotation: 0.0,
         width: 1,
         height: 1,
         textureInfo: textureInfos[textureIndex],
      };
      drawInfos.push(drawInfo);
   }

   function handleResize() {
      drawInfos[0].x = gl.canvas.width/2;
      resizeCanvasToDisplaySize(gl.canvas);
   }
   const resizeObserver = new ResizeObserver(handleResize);
   resizeObserver.observe(gl.canvas, { box: 'content-box' });

   return drawInfos;
}

function update(context, deltaTime, speed) {
//   let drawInfos = context.drawInfo;
   let drawInfos = [ context.drawInfo[0] ];
   let gl = context.gl;
   
   let y = 0;
   let tileSpaceX = 65;
   let tileSpaceY = 65;

   context.map?.data.forEach((row) => {

      let x = 0;
      row.forEach((id) => {
         let icon = context.map.icons[id];
         let drawInfo = icon;
         drawInfo.x = x * tileSpaceX;
         drawInfo.y = y * tileSpaceY; 
         drawInfos.push(drawInfo);
         x += 1;
      });
      y += 1;
   });
   drawInfos.forEach(function (drawInfo) {
      drawInfo.x += drawInfo.dx * speed * deltaTime;
      drawInfo.y += drawInfo.dy * speed * deltaTime;
      if (drawInfo.x < 0) {
         drawInfo.dx = 1;
      }
      if (drawInfo.x >= gl.canvas.width) {
         drawInfo.dx = -1;
      }
      if (drawInfo.y < 0) {
         drawInfo.dy = 1;
      }
      if (drawInfo.y >= gl.canvas.height) {
         drawInfo.dy = -1;
      }
      drawInfo.rotation += drawInfo.deltaRotation * deltaTime;
   });
   context.drawInfo = drawInfos;
}

function initTextureBuffers(gl, program) {
   console.log("initTextureBuffers");

   let texcoordLocation = gl.getAttribLocation(program, "a_texcoord");

   // Create a buffer for texture coords
   var texcoordBuffer = gl.createBuffer();
   gl.bindBuffer(gl.ARRAY_BUFFER, texcoordBuffer);

   // Put texcoords in the buffer
   var texcoords = [
      0, 0,
      0, 1,
      1, 0,
      1, 0,
      0, 1,
      1, 1,
   ];
   gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(texcoords), gl.STATIC_DRAW);
   return {
      texcoordLocation: texcoordLocation,
      texcoordBuffer: texcoordBuffer
   };
}

function initPositionBuffers(gl, program) {
   console.log("initPositionBuffers");
   let positionLocation = gl.getAttribLocation(program, "a_position");
   // Create a buffer.
   let positionBuffer = gl.createBuffer();
   gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);

   // Put a unit quad in the buffer
   // all the work is done with a matrix
   let positions = [
      0, 0,
      0, 1,
      1, 0,
      1, 0,
      0, 1,
      1, 1,
   ];
   gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

   return {
      positionLocation: positionLocation,
      positionBuffer: positionBuffer
   };
}

function initUniforms(gl, program) {
   console.log("initUniforms");
   let matrixLocation = gl.getUniformLocation(program, "u_matrix");
   let textureMatrixLocation = gl.getUniformLocation(program, "u_textureMatrix");
   let textureLocation = gl.getUniformLocation(program, "u_texture");
   return {
      matrixLocation: matrixLocation,
      textureMatrixLocation: textureMatrixLocation,
      textureLocation: textureLocation
   }
}



function Map(props) {
   const ref = React.useRef(null);
   var ctx;

   var then = 0;
   function render(time) {
      var now = time * 0.001;
      var deltaTime = Math.min(0.1, now - then);
      then = now;

      let speed = 60;
      update(ctx, deltaTime, speed);
      draw(ctx);

      requestAnimationFrame(render);
   }


   useEffect(() => {
      let canvas = ref.current;
      let shaderName = "drawImage2";

      ctx = initRenderContext(canvas, shaderName);
      loadMapIconSheet(ctx, 'img/shader/hex-icons-fantasy-map.png');

      requestAnimationFrame(render);

   }, []);



   return (
      <section id="map">
         <div>
            <div className="view-container">
               <h2>select map</h2>
               <canvas ref={ref} id="c" className="shader-canvas"></canvas>
            </div>
         </div>
      </section>
   );
};



// Export out the React Component
export default Map;
