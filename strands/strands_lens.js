// p5.js 2.x: lens distortion with p5.strands
// Bends the picture like a camera lens. Move the mouse left and right:
//   left   - straight lines bow inwards, and the corners stretch out
//            (pincushion distortion)
//   middle - no distortion
//   right  - straight lines bow outwards, like a fisheye lens or an old TV
//            (barrel distortion)

let lensShader;

function setup() {
  createCanvas(windowWidth, windowHeight);

  // Turn the lens() function below into a shader that runs on the GPU
  lensShader = buildFilterShader(lens);
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

function draw() {
  // 1. Draw something with ordinary p5 code. A grid of straight lines
  // makes it easy to see how the lens bends things.
  background(20, 30, 60);
  stroke(100, 180, 255);
  strokeWeight(3);
  for (let x = 0; x < width; x += 60) line(x, 0, x, height);
  for (let y = 0; y < height; y += 60) line(0, y, width, y);
  noStroke();
  fill(255, 200, 0);
  textSize(120);
  textAlign(CENTER, CENTER);
  text("strands", width / 2, height / 2);

  // 2. Run the shader over everything drawn so far
  filter(lensShader);
}

// This runs once for every pixel, all at the same time on the GPU
function lens() {
  // How much to bend, from the mouse: -0.4 at the left, 0 in the middle,
  // 1 at the right. The left side stops at -0.4 because any more makes the
  // edges fold back over themselves.
  let bend = uniformFloat(() => {
    let m = (mouseX / width) * 2 - 1;
    return m < 0 ? m * 0.4 : m;
  });

  filterColor.begin();

  // Where this pixel is: 0 to 1 across and down the canvas
  let uv = filterColor.texCoord;

  // Where this pixel is compared to the centre
  let fromCentre = uv - [0.5, 0.5];

  // How far from the centre, squared. x is stretched by the canvas shape
  // so the lens is round, not squashed to fit the window.
  let size = filterColor.canvasSize;
  let x = fromCentre.x * (size.x / size.y);
  let distSq = x * x + fromCentre.y * fromCentre.y;

  // The lens: read the colour from further out or closer in, by an amount
  // that grows quickly towards the edges. Reading from further out squeezes
  // the picture towards the middle, so straight lines bow outwards (barrel).
  // Reading from closer in stretches the edges, so lines bow inwards
  // (pincushion).
  let lensUV = [0.5, 0.5] + fromCentre * (1 + bend * distSq);
  let colour = getTexture(filterColor.canvasContent, lensUV);

  // Anything read from outside the canvas is black
  let inside =
    step(0, lensUV.x) * step(lensUV.x, 1) *
    step(0, lensUV.y) * step(lensUV.y, 1);

  filterColor.set([colour.r * inside, colour.g * inside, colour.b * inside, 1]);

  filterColor.end();
}
