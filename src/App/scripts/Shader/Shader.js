var twgl = require("twgl.js");

// todo: handle gl context loss
// https://medium.com/@mattdesl/non-intrusive-webgl-cebd176c281d
// other optimizations
//  https://blog.tojicode.com/2013/08/holistic-webgl.html


// *** utility 
function isPowerOf2(value) {
   return (value & (value - 1)) === 0;
}

// private texture stuff

function loadImageElementPromise(url) {

   // Define the promise
   const imgPromise = new Promise(function imgPromise(resolve, reject) {
      // Create the image
      const imgElement = new Image();
      // When image is loaded, resolve the promise
      imgElement.addEventListener('load', function imgOnLoad() {
         if (isPowerOf2(imgElement.width) && isPowerOf2(imgElement.height)) {
            //console.log(`img ${url} size is a power of tw0`);
         }
         else {
            console.log(`img ${url} is ${imgElement.width}x${imgElement.height} `);
         }

         resolve(imgElement);
      });

      imgElement.addEventListener('error', function imgOnError() {
         console.log("listener error");
         reject();
      })

      // Assign URL
      imgElement.crossOrigin = 'anonymous';
      imgElement.src = url;

   });
   return imgPromise;
}

function getImageData(imgElement) {
   // use a private canvas 2D to read the image
   const canvasContext = document.createElement('canvas').getContext('2d');
   canvasContext.canvas.width = imgElement.width;
   canvasContext.canvas.height = imgElement.height;
   canvasContext.drawImage(imgElement, 0, 0);
   const imageData = canvasContext.getImageData(0, 0, canvasContext.canvas.width, canvasContext.canvas.height);
   return imageData;
}


export class Shader {
   // texture stuff
   // todo: track loaded and loading textures
   promisedImageData(url) {
      return loadImageElementPromise(url).then((imgElement) => {
         return {
            imgElement: imgElement,
            imageData: getImageData(imgElement)
         };
      });
   }

   // gl stuff
   initGl(canvas) {
      return canvas.getContext("webgl");
   }

   initRenderProgram(gl, shaderName) {
      // Get the strings for our GLSL shaders
      const vs = require(`../../shaders/${shaderName}.vert`);
      const fs = require(`../../shaders/${shaderName}.frag`);
      //   console.log("\nvertexShaderSource:\n" + vs);
      //   console.log("\nfragmentShaderSource:\n" + fs);

      // create GLSL shaders, upload the GLSL source, compile the shaders
      const programInfo = twgl.createProgramInfo(gl, [vs, fs]);

      return programInfo;
   }

   initShader(gl, shaderName) {
      const programInfo = this.initRenderProgram(gl, shaderName);
      let shader = {};
      shader.name = shaderName;
      shader.programInfo = programInfo;
      return [shaderName, shader];
   }
   useProgramEnables(ctx) {
      // these should depend on the shader
      const shader = ctx.shaders[ctx.currentShader];
      const gl = ctx.gl;
      // todo: track enabled properties
      gl.enable(gl.DEPTH_TEST);
      gl.enable(gl.CULL_FACE);

   }
   useProgram(ctx) {
      const gl = ctx.gl;
      // set shader depending on the draw info we want
      if (ctx.currentShaderProgram != ctx.currentShader) {
         const shader = ctx.shaders[ctx.currentShader];
         const programInfo = shader.programInfo;
         gl.useProgram(programInfo.program);
      }
   }
}