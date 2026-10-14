// The simplest rope: a row of points joined by sticks.
// Hold the mouse button down to drag the end of the rope.
//
// Each frame:
//   1. Move every point: keep its speed, and add gravity.
//   2. Fix the sticks: pull each pair of neighbours back to the right distance.
//   3. Pin the top point in place.

let points = [];
let gap = 20;      // length of each stick
let gravity = 0.5;

function setup() {
  createCanvas(400, 400);

  // Make 15 points in a line going down from the top middle
  for (let i = 0; i < 15; i++) {
    let x = width / 2;
    let y = 20 + i * gap;
    // x, y = where it is now. oldX, oldY = where it was last frame.
    points.push({ x: x, y: y, oldX: x, oldY: y });
  }
}

function draw() {
  background(240);

  // 1. Move every point
  for (let p of points) {
    // Speed is how far it moved last frame
    let speedX = p.x - p.oldX;
    let speedY = p.y - p.oldY;

    // Remember where it is now, before moving it
    p.oldX = p.x;
    p.oldY = p.y;

    // Keep moving at the same speed, and fall a little
    p.x += speedX;
    p.y += speedY + gravity;
  }

  // Drag the last point with the mouse
  if (mouseIsPressed) {
    let last = points[points.length - 1];
    last.x = mouseX;
    last.y = mouseY;
  }

  // 2. Fix the sticks. Doing it a few times makes the rope less stretchy.
  for (let n = 0; n < 5; n++) {
    for (let i = 0; i < points.length - 1; i++) {
      let a = points[i];
      let b = points[i + 1];

      // How far apart are they, and how wrong is that?
      let d = dist(a.x, a.y, b.x, b.y);
      //let error = (d - gap);
       let error = (d - gap) / d;

      // Move both points half the error towards (or away from) each other
      let moveX = (b.x - a.x) * error * 0.5;
      let moveY = (b.y - a.y) * error * 0.5;
      a.x += moveX;
      a.y += moveY;
      b.x -= moveX;
      b.y -= moveY;
    }

    // 3. Pin the top point back where it belongs
    points[0].x = width / 2;
    points[0].y = 20;
  }

  // Draw the sticks and the points
  stroke(0);
  strokeWeight(2);
  for (let i = 0; i < points.length - 1; i++) {
    line(points[i].x, points[i].y, points[i + 1].x, points[i + 1].y);
  }
  fill(255, 100, 100);
  for (let p of points) {
    circle(p.x, p.y, 10);
  }
}
