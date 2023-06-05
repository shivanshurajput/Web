// Create a canvas element
var canvas = document.createElement("canvas");

// Set the canvas size to 75% of the window width and height
var width = canvas.width = window.innerWidth * 1;
var height = canvas.height = window.innerHeight * 1;

// Append the canvas to the body of the document
document.body.appendChild(canvas);

// Get the WebGL rendering context
var gl = canvas.getContext('webgl');
gl.viewport(0, 0, width, height);

// Store the mouse position
var mouse = { x: 0, y: 0 };

// Define the number of metaballs
var numMetaballs = 30;

// Create an array to store the metaballs
var metaballs = [];

// Generate random metaballs with positions, velocities, and radii
for (var i = 0; i < numMetaballs; i++) {
  var radius = Math.random() * (Math.min(width, height) * 0.09) + 5;
  metaballs.push({
    x: Math.random() * (width - 2 * radius) + radius,
    y: Math.random() * (height - 2 * radius) + radius,
    vx: (Math.random() - 0.5) * 1.5,
    vy: (Math.random() - 0.5) * 1.5,
    r: radius * 0.75
  });
}

// Vertex shader source code
var vertexShaderSrc = `
attribute vec2 position;

void main() {
  // position specifies only x and y.
  // We set z to be 0.0, and w to be 1.0
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

// Fragment shader source code
var fragmentShaderSrc = `
precision highp float;

const float WIDTH = ` + (width >> 0) + `.0;
const float HEIGHT = ` + (height >> 0) + `.0;

uniform vec3 metaballs[` + numMetaballs + `];

void main() {
  float x = gl_FragCoord.x;
  float y = gl_FragCoord.y;

  float sum = 0.0;
  for (int i = 0; i < ` + numMetaballs + `; i++) {
    vec3 metaball = metaballs[i];
    float dx = metaball.x - x;
    float dy = metaball.y - y;
    float radius = metaball.z;

    sum += (radius * radius) / (dx * dx + dy * dy);
  }

  if (sum >= 0.99) {
    gl_FragColor = vec4(mix(vec3(x / WIDTH, y / HEIGHT, 1.0), vec3(0, 0, 0), max(0.0, 1.0 - (sum - 0.99) * 100.0)), 1.0);
    return;
  }

  gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
}
`;

// Compile the vertex shader
var vertexShader = compileShader(vertexShaderSrc, gl.VERTEX_SHADER);

// Compile the fragment shader
var fragmentShader = compileShader(fragmentShaderSrc, gl.FRAGMENT_SHADER);

// Create the program and attach the shaders
var program = gl.createProgram();
gl.attachShader(program, vertexShader);
gl.attachShader(program, fragmentShader);

// Link the program
gl.linkProgram(program);

// Use the program for rendering
gl.useProgram(program);

// Create vertex data for a rectangle
var vertexData = new Float32Array([
  -1.0,  1.0,  // top left
  -1.0, -1.0,  // bottom left
  1.0,  1.0,  // top right
  1.0, -1.0,  // bottom right
]);

// Create a buffer and bind the vertex data
var vertexDataBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, vertexDataBuffer);
gl.bufferData(gl.ARRAY_BUFFER, vertexData, gl.STATIC_DRAW);

// Get the attribute location for the position
var positionHandle = getAttribLocation(program, 'position');
gl.enableVertexAttribArray(positionHandle);
gl.vertexAttribPointer(
  positionHandle,
  2,        // position is a vec2
  gl.FLOAT, // each component is a float
  gl.FALSE, // don't normalize values
  2 * 4,    // two 4 byte float components per vertex
  0         // offset into each span of vertex data
);

// Get the uniform location for the metaballs
var metaballsHandle = getUniformLocation(program, 'metaballs');

// Start the rendering loop
loop();

function loop() {
  // Update the positions of the metaballs
  for (var i = 0; i < numMetaballs; i++) {
    var metaball = metaballs[i];
    metaball.x += metaball.vx;
    metaball.y += metaball.vy;

    // Reverse the velocity if a metaball hits the boundaries
    if (metaball.x < metaball.r || metaball.x > width - metaball.r) metaball.vx *= -1;
    if (metaball.y < metaball.r || metaball.y > height - metaball.r) metaball.vy *= -1;
  }

  // Create an array to send the metaball data to the GPU
  var dataToSendToGPU = new Float32Array(3 * numMetaballs);
  for (var i = 0; i < numMetaballs; i++) {
    var baseIndex = 3 * i;
    var mb = metaballs[i];
    dataToSendToGPU[baseIndex + 0] = mb.x;
    dataToSendToGPU[baseIndex + 1] = mb.y;
    dataToSendToGPU[baseIndex + 2] = mb.r;
  }

  // Set the metaball data as a uniform variable in the shader program
  gl.uniform3fv(metaballsHandle, dataToSendToGPU);

  // Draw the metaballs
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

  // Request the next animation frame
  requestAnimationFrame(loop);
}

// Compile a shader from source code
function compileShader(shaderSource, shaderType) {
  var shader = gl.createShader(shaderType);
  gl.shaderSource(shader, shaderSource);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    throw "Shader compile failed with: " + gl.getShaderInfoLog(shader);
  }

  return shader;
}

// Get the location of a uniform variable in the shader program
function getUniformLocation(program, name) {
  var uniformLocation = gl.getUniformLocation(program, name);
  if (uniformLocation === -1) {
    throw 'Can not find uniform ' + name + '.';
  }
  return uniformLocation;
}

// Get the location of an attribute variable in the shader program
function getAttribLocation(program, name) {
  var attributeLocation = gl.getAttribLocation(program, name);
  if (attributeLocation === -1) {
    throw 'Can not find attribute ' + name + '.';
  }
  return attributeLocation;
}

// Update the mouse position when the mouse moves
canvas.onmousemove = function(e) {
  mouse.x = e.clientX;
  mouse.y = e.clientY;
};