// p5.js 2.x: the simplest p5.strands example
// Draw normally with p5, then run a shader over the whole canvas that makes
// it wobble like it's under water. Move the mouse left and right to change
// how strong the wobble is.

let waveShader;

function setup() {
  createCanvas(windowWidth, windowHeight);

  // Turn the wave() function below into a shader that runs on the GPU
  waveShader = buildFilterShader(wave);
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

function draw() {
  // 1. Draw something with ordinary p5 code
  background(20, 30, 60);
  noStroke();
  fill(255, 200, 0);
  circle(width / 2, height / 2, 300);
  fill(255);
  textSize(120);
  textAlign(CENTER, CENTER);
  text("strands", width / 2, height / 2);

  // 2. Run the shader over everything drawn so far
  filter(waveShader);
}

// This runs once for every pixel, all at the same time on the GPU
function wave() {
  // A uniform passes a value from the sketch into the shader every frame
  let strength = uniformFloat(() => mouseX / width);
  let time = millis();

  filterColor.begin();

  // Where this pixel is: 0 to 1 across and down the canvas
  let uv = filterColor.texCoord;

  // Shift each row sideways by a sine wave that moves over time
  let shift = sin(uv.y * 20 + time * 0.003) * 0.03 * strength;

  // Read the colour from the shifted spot instead, and use that for this pixel
  let colour = getTexture(filterColor.canvasContent, [uv.x + shift, uv.y]);
  filterColor.set(colour);

  filterColor.end();
}
