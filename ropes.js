// p5.js 2.x rope physics
// A row of ropes hangs from the top of the screen to the bottom.
// Move the mouse through them to push them around; they swing and settle.

const SPACING = 50;       // pixels between ropes
const SEGMENTS = 10;      // points per rope (more = smoother but slower)
const GRAVITY = 0.9;
const DAMPING = 1;     // 1 = swings forever, lower = settles faster
const MOUSE_RADIUS = 120; // how far the mouse reaches
const MOUSE_PUSH = 0.6;   // how strongly mouse movement pushes the ropes

let ropes = [];
let segLen;

function setup() {
  createCanvas(windowWidth, windowHeight);
  makeRopes();
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

  let mvx = mouseX - pmouseX;
  let mvy = mouseY - pmouseY;

  for (let rope of ropes) {
    updateRope(rope, mvx, mvy);
  }

  noFill();
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
}

// Verlet rope: move each point by its momentum plus gravity and the mouse,
// then pull neighbouring points back to the right distance apart.
function updateRope(rope, mvx, mvy) {
  for (let i = 1; i < rope.length; i++) {
    let p = rope[i];
    let vx = (p.x - p.px) * DAMPING;
    let vy = (p.y - p.py) * DAMPING;
    p.px = p.x;
    p.py = p.y;
    p.x += vx;
    p.y += vy + GRAVITY;

    // Points near the mouse get dragged along with it, more strongly the closer they are
    let d = dist(p.x, p.y, mouseX, mouseY);
    if (d < MOUSE_RADIUS) {
      let f = (1 - d / MOUSE_RADIUS) * MOUSE_PUSH;
      p.x += mvx * f;
      p.y += mvy * f;
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
