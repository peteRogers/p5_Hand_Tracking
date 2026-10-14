// p5.js 2.x: chromatic aberration with p5.strands
// Splits the red, green and blue parts of the image apart, like a cheap lens
// or an old TV. The split grows towards the edges of the screen.
// Move the mouse left and right to change how strong it is. The stronger it
// gets, the more blurred it gets.

let chromaticShader;

function setup() {
  createCanvas(windowWidth, windowHeight);

  // Turn the chromatic() function below into a shader that runs on the GPU
  chromaticShader = buildFilterShader(chromatic);
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

function draw() {
  // 1. Draw something with ordinary p5 code. White shows the effect best,
  // because it's made of all three colours.
  background(10);
  noFill();
  stroke(255);
  strokeWeight(6);
  for (let r = 100; r < max(width, height); r += 160) {
    circle(width / 2, height / 2, r);
  }
  noStroke();
  fill(255);
  textSize(120);
  textAlign(CENTER, CENTER);
  text("strands", width / 2, height / 2);

  // 2. Run the shader over everything drawn so far
  filter(chromaticShader);
}

// This runs once for every pixel, all at the same time on the GPU
function chromatic() {
  // How strong the effect is, from the mouse: 0 at the left, 1 at the right
  let amount = uniformFloat(() => mouseX / width);

  // Read the canvas at pos, blurred along dir: the average of five samples
  // spread out from pos - dir to pos + dir
  function blurred(pos, dir) {
    let sum =
      getTexture(filterColor.canvasContent, pos - dir) +
      getTexture(filterColor.canvasContent, pos - dir * 0.5) +
      getTexture(filterColor.canvasContent, pos) +
      getTexture(filterColor.canvasContent, pos + dir * 0.5) +
      getTexture(filterColor.canvasContent, pos + dir);
    return sum / 5;
  }

  filterColor.begin();

  // Where this pixel is: 0 to 1 across and down the canvas
  let uv = filterColor.texCoord;

  // How far to split the colours. Pointing out from the centre, and bigger
  // the further this pixel is from the centre.
  let offset = (uv - [0.5, 0.5]) * 0.025 * amount;

  // Blur: smear each colour along the same direction. It grows with the
  // effect, so a little split is sharp and a big split is soft.
  let spread = offset * amount * 1.2;

  // Read each colour from a slightly different place. Reading red from
  // further out shrinks the red picture towards the centre, and reading blue
  // from further in spreads the blue picture outwards. Green stays put.
  let r = blurred(uv + offset, spread).r;
  let g = blurred(uv, spread).g;
  let b = blurred(uv - offset, spread).b;

  filterColor.set([r, g, b, 1]);

  filterColor.end();
}
