// p5.js 2.x + ml5.js 1.x hand tracking
// Labels each of the 21 hand keypoints with its index number.
// Turns each hand into a Labubu puppet made only of shapes: the palm is the
// face, the index and middle fingers are bendable ears, and legs dangle below.

let handPose;
let video;
let hands = [];

async function setup() {
  createCanvas(windowWidth, windowHeight);

  // Start the camera first so it warms up while the model downloads
  video = createCapture(VIDEO, { flipped: true });
  video.size(1240, 720);
  video.hide();

  // In p5 2.x there is no preload(), so await the model in setup().
  // "lite" is a smaller, faster-loading model than the default "full".
  handPose = await ml5.handPose({ flipped: true, modelType: "lite" });

  handPose.detectStart(video, gotHands);
}

function gotHands(results) {
  hands = results;
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

function draw() {
  background(17);
  if (!video) return;

  // Scale everything to cover the canvas once, up front.
  // After this, draw using plain video coordinates (kp.x, kp.y).
  // let s = max(width / video.width, height / video.height);
  // push();
  // translate((width - video.width * s) / 2, (height - video.height * s) / 2);
  // scale(s);

  image(video, 0, 0);

  textSize(16);
  textAlign(CENTER, CENTER);

  for (let hand of hands) {
    // for (let i = 0; i < hand.keypoints.length; i++) {
    //   let kp = hand.keypoints[i];

    //   noStroke();
    //   fill(0, 255, 0);
    //   circle(kp.x, kp.y, 8);

    //   stroke(0);
    //   strokeWeight(3);
    //   fill(255);
    //   text(i, kp.x + 12, kp.y - 12);
    // }

    // drawBands(hand, [17, 18, 19]);
    // drawBands(hand, [13, 14, 15]);
    // drawBands(hand, [9, 10, 11]);
    // drawBands(hand, [5, 6, 7]);
    // drawBands(hand, [ 2, 3]);
    // beginShape();

    // vertex(hand.keypoints[17].x-10, hand.keypoints[17].y);
    // vertex(hand.keypoints[17].x+10, hand.keypoints[17].y);
    // vertex(hand.keypoints[13].x, hand.keypoints[13].y);
    // vertex(hand.keypoints[9].x, hand.keypoints[9].y);
    // vertex(hand.keypoints[5].x, hand.keypoints[5].y);
    // vertex(hand.keypoints[2].x, hand.keypoints[2].y);
    // vertex(hand.keypoints[1].x, hand.keypoints[1].y);
    // vertex(hand.keypoints[0].x, hand.keypoints[0].y);
    //  endShape(CLOSE);
    ellipse(hand.keypoints[20].x, hand.keypoints[20].y, 20, 20);

    drawLabubu(hand, hands.indexOf(hand));
    

    

  }

 // pop();
}

// Draw a band from each starting keypoint to the next one.
// thickness is how far each side of the keypoint the band extends.
function drawBands(hand, starts, thickness = 10) {
  for (let start of starts) {
    let a = hand.keypoints[start];
    let b = hand.keypoints[start + 1];

    beginShape();
    vertex(a.x - thickness, a.y);
    vertex(b.x - thickness, b.y);
    vertex(b.x + thickness, b.y);
    vertex(a.x + thickness, a.y);
    endShape(CLOSE);
  }
}

// Labubu colours
const FUR = [140, 92, 62];
const FACE = [242, 218, 192];
const PINK = [240, 150, 160];
const DARK = [40, 25, 20];

// Dangling legs for each hand, kept between frames so they can swing
let legStates = [];

// Which way each puppet faces: 1 = face towards you, -1 = back of its head.
// Smoothed so it turns around instead of snapping.
let facingStates = [];

// If the puppet shows its back when your palm faces the camera, set this to true
const FLIP_FACING = true;

// A Labubu hand puppet: face on the palm, ears on the index and middle
// fingers (they bend with your fingers), and legs that hang down and swing.
function drawLabubu(hand, h) {
  let kp = hand.keypoints;
  let u = dist(kp[0].x, kp[0].y, kp[9].x, kp[9].y); // palm length, sets the size
  if (u < 5) return;

  // Palm centre and which way is "up" (wrist towards the fingers)
  let cx = (kp[0].x + kp[5].x + kp[9].x + kp[13].x + kp[17].x) / 5;
  let cy = (kp[0].y + kp[5].y + kp[9].y + kp[13].y + kp[17].y) / 5;
  let angle = atan2(kp[9].y - kp[0].y, kp[9].x - kp[0].x) + HALF_PI;
  let k = u * 1.5; // head size unit

  // Palm or back of the hand towards the camera? The knuckles (5 and 17) run
  // one way round the wrist for a palm and the other way for the back of the
  // hand, but that also swaps between left and right hands.
  let z = (kp[5].x - kp[0].x) * (kp[17].y - kp[0].y) - (kp[5].y - kp[0].y) * (kp[17].x - kp[0].x);
  let target = Math.sign(z) * (hand.handedness === "Left" ? 1 : -1) * (FLIP_FACING ? -1 : 1);
  if (facingStates[h] === undefined) facingStates[h] = target;
  facingStates[h] = lerp(facingStates[h], target, 0.2);
  let facing = facingStates[h];
  let front = facing > 0;

  noStroke();

  // Ears follow the finger joints, so they bend when your fingers bend.
  // Drawn first so the head covers where they join.
  drawEar([kp[5], kp[6], kp[7], kp[8]], u, front);
  drawEar([kp[9], kp[10], kp[11], kp[12]], u, front);

  // Legs hang from the bottom of the head, under gravity
  let hips = [-1, 1].map((side) => toScreen(cx, cy, angle, side * 0.17 * k, 0.36 * k));
  if (!legStates[h]) legStates[h] = hips.map((hip) => makeLeg(hip, 0.14 * k));
  for (let i = 0; i < 2; i++) {
    let leg = legStates[h][i];
    updateLeg(leg, hips[i], 0.14 * k);
    drawLeg(leg, k);
  }

  // Head and face on the palm. Squashing it sideways as "facing" passes
  // through 0 makes it look like it is turning round.
  push();
  translate(cx, cy);
  rotate(angle);
  scale(max(abs(facing), 0.05), 1);
  if (front) drawHead(k);
  else drawHeadBack(k);
  pop();
}

// Convert a point in the head's own coordinates to screen coordinates
function toScreen(cx, cy, angle, x, y) {
  return {
    x: cx + x * cos(angle) - y * sin(angle),
    y: cy + x * sin(angle) + y * cos(angle),
  };
}

// A long bunny ear along a finger: a tapered outline either side of the joints,
// with a pink inner ear on top when seen from the front.
function drawEar(joints, u, front) {
  fill(FUR);
  earShape(joints, [0.13, 0.15, 0.12, 0.07].map((w) => w * u), 0.12 * u);
  if (!front) return;
  fill(PINK);
  earShape(joints, [0.03, 0.07, 0.06, 0.03].map((w) => w * u), 0.02 * u);
}

// Smooth outline around a chain of joints. widths[i] is the half-width at
// joint i, and the tip pokes out past the last joint by tipLength.
function earShape(joints, widths, tipLength) {
  let left = [];
  let right = [];
  for (let i = 0; i < joints.length; i++) {
    // Direction of the finger at this joint
    let a = joints[max(i - 1, 0)];
    let b = joints[min(i + 1, joints.length - 1)];
    let d = createVector(b.x - a.x, b.y - a.y).normalize();
    let nx = -d.y * widths[i];
    let ny = d.x * widths[i];
    left.push([joints[i].x + nx, joints[i].y + ny]);
    right.push([joints[i].x - nx, joints[i].y - ny]);
  }
  // Tip: extend the last finger segment
  let last = joints[joints.length - 1];
  let prev = joints[joints.length - 2];
  let d = createVector(last.x - prev.x, last.y - prev.y).normalize();
  let tip = [last.x + d.x * tipLength, last.y + d.y * tipLength];

  beginShape();
  for (let p of left) splineVertex(p[0], p[1]);
  splineVertex(tip[0], tip[1]);
  for (let p of right.reverse()) splineVertex(p[0], p[1]);
  endShape(CLOSE);
}

// A leg is a short chain of points; the first is pinned to the hip.
function makeLeg(hip, segLen) {
  let leg = [];
  for (let i = 0; i < 4; i++) {
    let y = hip.y + i * segLen;
    leg.push({ x: hip.x, y, px: hip.x, py: y });
  }
  return leg;
}

// Simple rope physics: each point keeps its momentum, falls under gravity,
// then the points are pulled back to the right distance from each other.
function updateLeg(leg, hip, segLen) {
  leg[0].x = leg[0].px = hip.x;
  leg[0].y = leg[0].py = hip.y;

  for (let i = 1; i < leg.length; i++) {
    let p = leg[i];
    let vx = (p.x - p.px) * 0.95;
    let vy = (p.y - p.py) * 0.95;
    p.px = p.x;
    p.py = p.y;
    p.x += vx;
    p.y += vy + segLen * 0.08; // gravity
  }

  for (let n = 0; n < 4; n++) {
    for (let i = 1; i < leg.length; i++) {
      let a = leg[i - 1];
      let b = leg[i];
      let dx = b.x - a.x;
      let dy = b.y - a.y;
      let d = max(sqrt(dx * dx + dy * dy), 0.001);
      let diff = (d - segLen) / d;
      if (i === 1) {
        // a is the pinned hip, so only b moves
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

// A furry leg with a little foot on the end
function drawLeg(leg, k) {
  stroke(FUR);
  strokeWeight(0.13 * k);
  strokeCap(ROUND);
  noFill();
  beginShape();
  for (let p of leg) splineVertex(p.x, p.y);
  endShape();
  noStroke();

  let end = leg[leg.length - 1];
  let before = leg[leg.length - 2];
  push();
  translate(end.x, end.y);
  rotate(atan2(end.y - before.y, end.x - before.x));
  fill(FUR);
  ellipse(0.03 * k, 0, 0.2 * k, 0.17 * k);
  fill(FACE);
  ellipse(0.07 * k, 0, 0.06 * k, 0.1 * k); // pale sole
  pop();
}

// The head, drawn around (0, 0) with "up" towards the fingers. k sets the size.
function drawHead(k) {
  // Furry head: a ring of tufts around a round head
  fill(FUR);
  for (let i = 0; i < 18; i++) {
    let a = (TWO_PI * i) / 18;
    circle(cos(a) * 0.4 * k, sin(a) * 0.35 * k, 0.16 * k);
  }
  ellipse(0, 0, 0.82 * k, 0.74 * k);

  // Face
  fill(FACE);
  ellipse(0, 0.05 * k, 0.6 * k, 0.5 * k);

  // Big eyes with highlights
  for (let side of [-1, 1]) {
    fill(DARK);
    ellipse(side * 0.13 * k, -0.02 * k, 0.16 * k, 0.19 * k);
    fill(255);
    circle(side * 0.13 * k + 0.03 * k, -0.06 * k, 0.05 * k);
    circle(side * 0.13 * k - 0.03 * k, 0.02 * k, 0.02 * k);
  }

  // Rosy cheeks and a tiny nose
  fill(PINK[0], PINK[1], PINK[2], 150);
  ellipse(-0.23 * k, 0.1 * k, 0.09 * k, 0.06 * k);
  ellipse(0.23 * k, 0.1 * k, 0.09 * k, 0.06 * k);
  fill(PINK);
  ellipse(0, 0.08 * k, 0.05 * k, 0.035 * k);

  // The famous grin: a wide mouth with nine pointy teeth
  let mw = 0.36 * k;  // mouth width
  let mh = 0.11 * k;  // mouth depth
  let my = 0.12 * k;  // top edge of the mouth
  fill(DARK);
  arc(0, my, mw, mh * 2, 0, PI, CHORD);
  fill(255);
  let teeth = 9;
  let tw = mw / teeth;
  for (let i = 0; i < teeth; i++) {
    let x = -mw / 2 + i * tw;
    // Shorter teeth towards the corners so they stay inside the mouth
    let c = (x + tw / 2) / (mw / 2);
    let th = min(0.05 * k, mh * sqrt(max(0, 1 - c * c)) * 0.8);
    triangle(x, my, x + tw, my, x + tw / 2, my + th);
  }
}

// The back of the head: all fur, with a darker tuft swirl in the middle
function drawHeadBack(k) {
  fill(FUR);
  for (let i = 0; i < 18; i++) {
    let a = (TWO_PI * i) / 18;
    circle(cos(a) * 0.4 * k, sin(a) * 0.35 * k, 0.16 * k);
  }
  ellipse(0, 0, 0.82 * k, 0.74 * k);

  // A few darker tufts so you can tell it is the back of the head
  fill(FUR[0] * 0.8, FUR[1] * 0.8, FUR[2] * 0.8);
  for (let i = 0; i < 6; i++) {
    let a = (TWO_PI * i) / 6 + 0.3;
    ellipse(cos(a) * 0.12 * k, sin(a) * 0.1 * k - 0.05 * k, 0.12 * k, 0.08 * k);
  }
  circle(0, -0.05 * k, 0.08 * k);
}
