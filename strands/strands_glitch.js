// p5.js 2.x: a heavy, pixelly glitch between two images, with p5.strands
// Move the mouse left and right:
//   left   - just the first image
//   middle - glitching as hard as it gets, flicking between the two
//   right  - just the second image
// While it glitches, the picture breaks into big blocks, slices jump
// sideways, the colours split, and blocks flick between the two images.
//
// Images (public domain, NASA, from Wikimedia Commons):
//   images/blue_marble.jpg         - The Blue Marble, Apollo 17 crew, 1972
//   images/pillars_of_creation.jpg - Pillars of Creation, NASA/ESA/Hubble Heritage Team, 2014

const CLEAN_EDGE = 0.15; // how much of each side of the screen shows a clean image, 0 to 0.5

let glitchShader;
let imageA, imageB;   // the two images, as loaded
let layerA, layerB;   // the two images cropped to fill the canvas

// Updated every frame, read by the shader
let progress = 0;     // 0 = image A, 1 = image B
let glitchAmount = 0; // 0 = clean, 1 = as glitchy as it gets

async function setup() {
  // WEBGL, because in p5 2.3.4 passing extra images into a filter shader
  // (uniformTexture) only works on a WEBGL canvas
  createCanvas(windowWidth, windowHeight, WEBGL);
  // The shader runs once per pixel, so keep the pixel count down on Retina screens
  pixelDensity(1);

  imageA = await loadImage("images/blue_marble.jpg");
  imageB = await loadImage("images/pillars_of_creation.jpg");
  makeLayers();

  // Turn the glitch() function below into a shader that runs on the GPU
  glitchShader = buildFilterShader(glitch);
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  makeLayers();
}

// Draw each image into its own canvas-sized layer, scaled to cover it,
// so the shader can read both at the same positions
function makeLayers() {
  layerA = coverLayer(imageA);
  layerB = coverLayer(imageB);
}

function coverLayer(img) {
  let layer = createGraphics(width, height);
  layer.pixelDensity(1);
  let s = max(width / img.width, height / img.height);
  layer.imageMode(CENTER);
  layer.image(img, width / 2, height / 2, img.width * s, img.height * s);
  return layer;
}

function draw() {
  if (!glitchShader) return;
  updateFromMouse();
  filter(glitchShader);
}

// Work out the mix and the glitch from where the mouse is across the screen
function updateFromMouse() {
  // 0 at the clean zone on the left, 1 at the clean zone on the right
  progress = constrain(map(mouseX, width * CLEAN_EDGE, width * (1 - CLEAN_EDGE), 0, 1), 0, 1);

  // Glitch is strongest in the middle, and fades out towards each side.
  // Squaring it keeps it gentle near the sides and builds up towards the middle.
  glitchAmount = pow(sin(progress * PI), 2);
}

// This runs once for every pixel, all at the same time on the GPU
function glitch() {
  let texA = uniformTexture(() => layerA);
  let texB = uniformTexture(() => layerB);
  let mixAmount = uniformFloat(() => progress);
  let amount = uniformFloat(() => glitchAmount);
  let time = millis();

  // A random number from 0 to 1 for any x, y and seed. The same inputs
  // always give the same number, so a whole block gets the same one.
  function random01(x, y, seed) {
    return fract(sin(x * 12.9898 + y * 78.233 + seed * 37.719) * 43758.5453);
  }

  filterColor.begin();

  // Where this pixel is: 0 to 1 across and down the canvas
  let uv = filterColor.texCoord;
  let size = filterColor.canvasSize;

  // The glitch changes 15 times a second, so it jumps instead of moving smoothly
  let tick = floor(time * 0.015);

  // 1. Slices: cut the screen into 25 horizontal strips, and make some of
  // them jump sideways
  let slice = floor(uv.y * 25);
  let sliceJumps = step(1 - amount * 0.6, random01(slice, 0, tick));
  let jump = (random01(slice, 1, tick) - 0.5) * 0.4 * amount * sliceJumps;
  let pos = uv + [jump, 0];

  // 2. Pixelate: cut the screen into big square blocks, and give every
  // pixel in a block the colour from the block's middle. Each strip gets
  // its own block size, and blocks get bigger as the glitch gets stronger.
  let blockSize = mix(1, 8 + random01(slice, 2, tick) * 40, amount); // in pixels

  // The colour of the block at p
  function blockColour(p) {
    let block = floor((p * size) / blockSize);
    let middle = ((block + 0.5) * blockSize) / size;

    // 3. Each block picks image A or B. As the switch goes on, more and more
    // blocks pick B, in a random order that reshuffles every tick.
    let showB = 1 - step(mixAmount, random01(block.x, block.y, tick));
    return mix(getTexture(texA, middle), getTexture(texB, middle), showB);
  }

  // 4. Colour split: red and blue use the same blocks shifted sideways,
  // so coloured edges appear along the blocks
  let split = [0.012 * amount, 0];
  let r = blockColour(pos + split).r;
  let g = blockColour(pos).g;
  let bl = blockColour(pos - split).b;

  // 5. A few blocks flash inverted colours at the height of the glitch
  let block = floor((pos * size) / blockSize);
  let invert = step(1 - amount * 0.05, random01(block.x, block.y, tick + 99)) * step(0.01, amount);
  r = mix(r, 1 - r, invert);
  g = mix(g, 1 - g, invert);
  bl = mix(bl, 1 - bl, invert);

  filterColor.set([r, g, bl, 1]);

  filterColor.end();
}
