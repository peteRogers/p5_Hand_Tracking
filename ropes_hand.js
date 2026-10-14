// p5.js 2.x + ml5.js 1.x rope physics
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
let segLen;

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
  segLen = height / SEGMENTS;
  for (let x = SPACING / 2; x < width; x += SPACING) {
    let rope = [];
    for (let i = 0; i <= SEGMENTS; i++) {
      let y = i * segLen;
      rope.push({ x, y, px: x, py: y });
    }
    ropes.push(rope);
  }
}

function draw() {
  background(255);

  updateFingers();

  for (let rope of ropes) {
    updateRope(rope);
  }

  noFill();
  stroke(0); // reset every frame: the fingertip dots below turn the stroke off
  strokeWeight(20);
  for (let r = 0; r < ropes.length; r++) {
    // Colour shifts across the screen
    let t = r / max(ropes.length - 1, 1);
    //stroke(lerpColor(color(80, 160, 255), color(255, 90, 180), t));
    let rope = ropes[r];
    beginShape();
    for (let p of rope) splineVertex(p.x, p.y);
    endShape();
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

// Verlet rope: move each point by its momentum plus gravity and the fingers,
// then pull neighbouring points back to the right distance apart.
function updateRope(rope) {
  for (let i = 1; i < rope.length; i++) {
    let p = rope[i];
    let vx = (p.x - p.px) * DAMPING;
    let vy = (p.y - p.py) * DAMPING;
    p.px = p.x;
    p.py = p.y;
    p.x += vx;
    p.y += vy + GRAVITY;

    // Points near a fingertip get dragged along with it, more strongly the closer they are
    for (let f of fingers) {
      let d = dist(p.x, p.y, f.x, f.y);
      if (d < FINGER_RADIUS) {
        let k = (1 - d / FINGER_RADIUS) * FINGER_PUSH;
        p.x += (f.x - f.px) * k;
        p.y += (f.y - f.py) * k;
      }
    }
  }

  // Top point stays pinned, so only the lower point moves for the first link
  for (let n = 0; n < 3; n++) {
    for (let i = 1; i < rope.length; i++) {
      let a = rope[i - 1];
      let b = rope[i];
      let dx = b.x - a.x;
      let dy = b.y - a.y;
      let d = max(sqrt(dx * dx + dy * dy), 0.001);
      let diff = (d - segLen) / d;
      if (i === 1) {
        b.x -= dx * diff;
        b.y -= dy * diff;
      } else {
        a.x += dx * diff * 0.5;
        a.y += dy * diff * 0.5;
        b.x -= dx * diff * 0.5;
        b.y -= dy * diff * 0.5;
      }
    }
  }
}
