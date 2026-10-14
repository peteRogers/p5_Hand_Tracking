// p5.js 2.x + ml5.js 1.x hand tracking + p5.strands
// Two hand effects you can pick between in draw():
//   drawLens()   - the video is grey except inside a magnifying lens on your
//                  index fingertip. Pinch thumb and index to resize it.
//   drawFlames() - blue gas flames burn on every fingertip of both hands and
//                  get blown back when a finger moves. Still fingers burn small.
// Call one, or both to layer them.

let handPose;
let video;
let hands = [];
let lensShader;
let flameShader;

// Lens position and radius in canvas pixels. The shader reads these every frame.
let lens = { x: 0, y: 0, r: 0 };

// Ten flames: slots 0-4 are one hand, 5-9 the other
// (thumb, index, middle, ring, pinky). Fingertip positions are in canvas
// pixels, parked off-screen when that hand is not visible.
const TIPS = [4, 8, 12, 16, 20];
const FLAMES = 10;
let tips = Array.from({ length: FLAMES }, () => [-9999, -9999]);
let prevTips = Array(FLAMES).fill(null);

// Full flame height for each hand, from its palm length, so it scales with distance
let handSize = [60, 60];

// Per-fingertip "wind" in flame units: the opposite of how the tip is moving,
// smoothed so the flames swing back upright when the hand stops.
let wind = Array.from({ length: FLAMES }, () => [0, 0]);

// Per-fingertip flame scale: grows quickly while a finger moves and dies
// down slowly once it is still (FLAME_STILL when still, up to FLAME_MOVING
// with lots of movement, when it also turns yellow at the tips).
let flameScale = Array(FLAMES).fill(0.3);
const FLAME_STILL = 0.3;   // size of a still finger's flame, 0..1
const STILL_SPEED = 0.01;  // movement below this (flame units per frame) counts as still
const FULL_SPEED = 0.06;   // movement at or above this gives a full-size flame
const FLAME_MOVING = 1.8;  // size of a fast-moving finger's flame

async function setup() {
  createCanvas(windowWidth, windowHeight);
  // Render at 1x even on Retina screens: the shaders run once per pixel,
  // so this cuts their work by 4x on a 2x display.
  pixelDensity(1);

  video = createCapture(VIDEO, { flipped: true });
  video.size(640, 480);
  video.hide();

  // Build the shaders from plain JavaScript functions (p5.strands).
  // Filter shaders work on a normal 2D canvas, no WEBGL needed.
  lensShader = buildFilterShader(lensEffect);
  flameShader = buildFilterShader(flameEffect);

  handPose = await ml5.handPose({ flipped: true, modelType: "lite", maxHands: 2 });
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

  drawVideo();
  trackHand();

  // Choose an effect (or call both to layer them)
 // drawLens();
   drawFlames();
}

function drawLens() {
  filter(lensShader);
}

function drawFlames() {
  filter(flameShader);
}

// How bright the video is: 1 = normal, 0 = black
const VIDEO_BRIGHTNESS = 0.15;

// Video scale and offset, so hand keypoints can be mapped to canvas pixels
let view = { s: 1, ox: 0, oy: 0 };

// Draw the video scaled to cover the canvas
function drawVideo() {
  view.s = max(width / video.width, height / video.height);
  view.ox = (width - video.width * view.s) / 2;
  view.oy = (height - video.height * view.s) / 2;
  image(video, view.ox, view.oy, video.width * view.s, video.height * view.s);

  // Darken the video with a translucent black layer
  noStroke();
  fill(0, 255 * (1 - VIDEO_BRIGHTNESS));
  rect(0, 0, width, height);
}

// Update the lens, fingertips and wind from the latest hands
function trackHand() {
  let { s, ox, oy } = view;
  let targetR = 0;

  if (hands.length > 0) {
    let kps = hands[0].keypoints;

    // Lens: centred on the index tip, sized by the thumb-index pinch
    let pinch = dist(kps[4].x, kps[4].y, kps[8].x, kps[8].y) * s;
    targetR = constrain(pinch * 0.8, 40, min(width, height) * 0.45);
    // Jump straight there if the lens was hidden, otherwise glide
    let k = lens.r < 1 ? 1 : 0.35;
    lens.x = lerp(lens.x, kps[8].x * s + ox, k);
    lens.y = lerp(lens.y, kps[8].y * s + oy, k);
  }
  lens.r = lerp(lens.r, targetR, 0.2);

  // Flames: five per hand
  let slots = handSlots();
  for (let h = 0; h < 2; h++) {
    let hand = slots[h];
    if (hand) {
      // Flame height from the palm length (wrist to middle knuckle)
      let kps = hand.keypoints;
      handSize[h] = dist(kps[0].x, kps[0].y, kps[9].x, kps[9].y) * s * 0.6;
    }
    for (let f = 0; f < 5; f++) {
      let i = h * 5 + f;
      if (hand) {
        let kp = hand.keypoints[TIPS[f]];
        tips[i] = [kp.x * s + ox, kp.y * s + oy];
        updateFlame(i, handSize[h]);
      } else {
        tips[i] = [-9999, -9999];
        prevTips[i] = null;
      }
    }
  }
}

// Keep each hand in the same slot so its flames don't swap between hands
// when ml5 lists them in a different order: left hand 0, right hand 1.
function handSlots() {
  let slots = [null, null];
  for (let hand of hands) {
    let h = hand.handedness === "Left" ? 0 : 1;
    if (slots[h]) h = 1 - h;   // both labelled the same: use the free slot
    if (!slots[h]) slots[h] = hand;
  }
  return slots;
}

// Turn fingertip i's movement into wind blowing the other way,
// and into how big its flame should be. size is that hand's flame height.
function updateFlame(i, size) {
  let target = [0, 0];
  let speed = 0;
  if (prevTips[i]) {
    // Movement since last frame, in flame units, reversed
    let vx = (tips[i][0] - prevTips[i][0]) / size;
    let vy = (tips[i][1] - prevTips[i][1]) / size;
    speed = Math.hypot(vx, vy);
    target = [-vx * 6, -vy * 6];

    // Limit how hard the flame can be blown
    let m = Math.hypot(target[0], target[1]);
    if (m > 1.5) target = [(target[0] / m) * 1.5, (target[1] / m) * 1.5];
  }
  // Lean quickly into the wind, recover more slowly
  let k = Math.hypot(...target) > Math.hypot(...wind[i]) ? 0.4 : 0.1;
  wind[i] = [lerp(wind[i][0], target[0], k), lerp(wind[i][1], target[1], k)];

  // Flame size: flare up quickly when moving, shrink back over a second or two
  let moving = constrain(map(speed, STILL_SPEED, FULL_SPEED, 0, 1), 0, 1);
  let targetScale = lerp(FLAME_STILL, FLAME_MOVING, moving);
  let g = targetScale > flameScale[i] ? 0.3 : 0.03;
  flameScale[i] = lerp(flameScale[i], targetScale, g);

  prevTips[i] = tips[i];
}

// What the flame shader needs for flame i: [tip x, tip y, wind x, wind y]
function flameData(i) {
  return [tips[i][0], tips[i][1], wind[i][0], wind[i][1]];
}

// For flame i: [height in pixels, how yellow it is 0..1]
function flameLook(i) {
  let height = handSize[Math.floor(i / 5)] * flameScale[i];
  // Only the top part of the size range (lots of movement) turns yellow
  let excite = (flameScale[i] - FLAME_STILL) / (FLAME_MOVING - FLAME_STILL);
  let yellow = constrain(map(excite, 0.5, 1, 0, 1), 0, 1);
  return [height, yellow];
}

// ---- Shaders: these functions are turned into GPU code that runs once per pixel ----

function lensEffect() {
  // Uniforms: values passed in from the sketch, refreshed every time filter() runs
  let center = uniformVec2(() => [lens.x, lens.y]);
  let radius = uniformFloat(() => lens.r);
  let time = uniformFloat(() => millis());

  filterColor.begin();
  let uv = filterColor.texCoord;              // 0..1 across the canvas
  let size = filterColor.canvasSize;
  let offset = uv * size - center;            // this pixel relative to the lens, in pixels
  let d = length(offset);

  // 1 inside the lens, 0 outside, with a soft edge
  let inside = 1 - smoothstep(radius - 3, radius, d);

  // Magnify: sample closer to the centre, with a little wobble
  let zoom = 0.6 + 0.05 * sin(d * 0.08 - time * 0.005);
  let lensUV = (center + offset * zoom) / size;

  // Chromatic split: red and blue sampled slightly apart
  let shift = 4 / size.x;
  let r = getTexture(filterColor.canvasContent, lensUV + [shift, 0]).r;
  let g = getTexture(filterColor.canvasContent, lensUV).g;
  let b = getTexture(filterColor.canvasContent, lensUV - [shift, 0]).b;

  // Outside the lens: dim greyscale
  let orig = getTexture(filterColor.canvasContent, uv);
  let grey = (orig.r * 0.299 + orig.g * 0.587 + orig.b * 0.114) * 0.6;

  // A thin glowing ring at the lens edge
  let ring = smoothstep(radius - 8, radius - 2, d) * inside;

  filterColor.set([
    mix(grey, r, inside) + ring * 0.2,
    mix(grey, g, inside) + ring * 0.9,
    mix(grey, b, inside) + ring * 0.6,
    1,
  ]);
  filterColor.end();
}

function flameEffect() {
  let time = uniformFloat(() => millis());
  // Per flame: f = [tip x, tip y, wind x, wind y], h = [height in pixels, yellowness]
  let f0 = uniformVec4(() => flameData(0));
  let f1 = uniformVec4(() => flameData(1));
  let f2 = uniformVec4(() => flameData(2));
  let f3 = uniformVec4(() => flameData(3));
  let f4 = uniformVec4(() => flameData(4));
  let f5 = uniformVec4(() => flameData(5));
  let f6 = uniformVec4(() => flameData(6));
  let f7 = uniformVec4(() => flameData(7));
  let f8 = uniformVec4(() => flameData(8));
  let f9 = uniformVec4(() => flameData(9));
  let h0 = uniformVec2(() => flameLook(0));
  let h1 = uniformVec2(() => flameLook(1));
  let h2 = uniformVec2(() => flameLook(2));
  let h3 = uniformVec2(() => flameLook(3));
  let h4 = uniformVec2(() => flameLook(4));
  let h5 = uniformVec2(() => flameLook(5));
  let h6 = uniformVec2(() => flameLook(6));
  let h7 = uniformVec2(() => flameLook(7));
  let h8 = uniformVec2(() => flameLook(8));
  let h9 = uniformVec2(() => flameLook(9));

  // A blue gas flame on a fingertip. Returns [heat, yellow heat]. Heat is
  // 0..2: the faint outer flame counts up to 1, and the bright inner cone
  // adds up to 1 more. Yellow heat is the part of the outer flame to tint yellow.
  function flame(f, h, p) {
    let tip = [f.x, f.y];
    let w = [f.z, f.w];
    let q = (p - tip) / h.x;

    // Most pixels are nowhere near this flame: skip the expensive part
    if (length(q) > 1.8) {
      return [0, 0];
    }

    // The flame leans with the wind (y is down on the canvas, so "up" is -1)
    let dir = normalize([w.x * 0.6, w.y * 0.6 - 1]);
    let perp = [0 - dir.y, dir.x];
    let up = dot(q, dir);               // distance along the flame
    let side = dot(q, perp);            // distance across the flame

    // ...and curves further at the top, and stretches when moving fast
    side = side - dot(w, perp) * 0.6 * up * up;
    up = up / (1 + length(w) * 0.4);

    // Gas flames are steady, with just a fine, fast shimmer
    let n = noise(side * 6, up * 5 - time * 0.012, time * 0.002) - 0.5;
    side = side + n * 0.06 * up;

    let base = smoothstep(-0.06, 0.03, up);

    // Outer flame: tall, thin, fading out towards the tip
    let t = clamp(up, 0, 1);
    let ow = 0.13 * (1 - t) + 0.01;
    let outer = (1 - smoothstep(ow * 0.5, ow, abs(side))) * base * (1 - t) * (1 - t * 0.3);

    // Inner cone: short and bright
    let ti = clamp(up / 0.4, 0, 1);
    let iw = 0.08 * (1 - ti);
    let inner = (1 - smoothstep(iw * 0.6, iw, abs(side))) * base * (1 - smoothstep(0.7, 1, ti));

    // Yellow shows towards the top of the outer flame
    let yellow = outer * h.y * smoothstep(0.1, 0.5, t);

    return [outer * 1.6 + inner, yellow * 1.6];
  }

  filterColor.begin();
  let px = filterColor.texCoord * filterColor.canvasSize;
  let orig = getTexture(filterColor.canvasContent, filterColor.texCoord);

  // Add up all ten, then colour deep blue -> light blue -> near white at the core
  let total =
    flame(f0, h0, px) + flame(f1, h1, px) + flame(f2, h2, px) + flame(f3, h3, px) +
    flame(f4, h4, px) + flame(f5, h5, px) + flame(f6, h6, px) + flame(f7, h7, px) +
    flame(f8, h8, px) + flame(f9, h9, px);
  let heat = clamp(total.x, 0, 2);
  let outerGlow = clamp(heat, 0, 1);
  let core = clamp(heat - 1, 0, 1);

  // Swap some of the blue outer glow for yellow-orange where the flame is excited
  let yel = clamp(total.y, 0, 1) * 0.8;
  let blueGlow = outerGlow * (1 - yel);

  filterColor.set([
    orig.r + blueGlow * 0.05 + yel * 1.0 + core * 0.55,
    orig.g + blueGlow * 0.25 + yel * 0.7 + core * 0.8,
    orig.b + blueGlow * 0.9 + yel * 0.1 + core * 0.9,
    1,
  ]);
  filterColor.end();
}
