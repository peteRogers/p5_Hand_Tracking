// p5.js 2.x + ml5.js 1.x rope physics, using the Rope class from rope.js
// A row of ropes hangs from the top of the screen to the bottom.
// Move your index finger through them to push them around; they swing and settle.
// The camera is used for hand tracking but never shown.

const SPACING = 50;       // pixels between ropes
const SEGMENTS = 10;      // points per rope (more = smoother but slower)
const GRAVITY = 0.85;
const DAMPING = 0.99;     // 1 = swings forever, lower = settles faster
const FINGER_RADIUS = 300; // how far the finger reaches
const FINGER_PUSH = 0.1;   // how strongly finger movement pushes the ropes

let ropes = [];

let handPose;
let video;
let hands = [];

// Smoothed index fingertip for each hand, in canvas pixels: { x, y, px, py }
let fingers = [];

async function setup() {
  createCanvas(windowWidth, windowHeight);
  makeRopes();

  // Camera for tracking only: hidden and never drawn
  video = createCapture(VIDEO, { flipped: true });
  video.size(640, 480);
  video.hide();

  handPose = await ml5.handPose({ flipped: true, modelType: "lite", maxHands: 2 });
  handPose.detectStart(video, gotHands);
  //frameRate(120);
}

function gotHands(results) {
  hands = results;
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  makeRopes();
}

// One rope every SPACING pixels across the screen, each pinned at the top
function makeRopes() {
  ropes = [];
  for (let x = SPACING / 2; x < width; x += SPACING) {
    ropes.push(new Rope(x, 0, {
      length: height,
      segments: SEGMENTS,
      gravity: GRAVITY,
      damping: DAMPING,
      stiffness: 3,
      color: 0,
      thickness: 20,
    }));
  }
}

function draw() {
  background(255);

  updateFingers();

  for (let r = 0; r < ropes.length; r++) {
    let rope = ropes[r];

    // Points near a fingertip get dragged along with it
    for (let f of fingers) {
      rope.push(f.x, f.y, f.x - f.px, f.y - f.py, FINGER_RADIUS, FINGER_PUSH);
    }
    rope.update();

    // Colour shifts across the screen
    let t = r / max(ropes.length - 1, 1);
    //rope.color = lerpColor(color(80, 160, 255), color(255, 90, 180), t);
    rope.draw();
  }

  // Show where each fingertip is, since the camera is hidden
  noStroke();
  fill(255, 80, 80);
  for (let f of fingers) circle(f.x, f.y, 16);
}

// Follow the index fingertip (keypoint 8) of each hand. The video is stretched
// over the whole canvas so your finger can reach every rope. Positions are
// smoothed because tracking is a little jittery.
function updateFingers() {
  if (!video || video.width === 0) return;

  if (hands.length !== fingers.length) fingers = [];

  for (let i = 0; i < hands.length; i++) {
    let tip = hands[i].keypoints[8];
    let x = (tip.x / video.width) * width;
    let y = (tip.y / video.height) * height;

    if (!fingers[i]) fingers[i] = { x, y, px: x, py: y };
    let f = fingers[i];
    f.px = f.x;
    f.py = f.y;
    f.x = lerp(f.x, x, 0.5);
    f.y = lerp(f.y, y, 0.5);
  }
}
