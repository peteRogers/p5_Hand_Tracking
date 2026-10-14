// p5.js 2.x: using the Rope class from rope.js
// Move the mouse through the ropes to push them.
// Hold the mouse button down to grab the end of the red rope.

let ropes = [];
let grabbed;

function setup() {
  createCanvas(windowWidth, windowHeight);

  // A row of ropes hanging from the top
  for (let x = 50; x < width; x += 60) {
    ropes.push(new Rope(x, 0, { length: height * 0.6, segments: 12, thickness: 10 }));
  }

  // One special rope with its own settings
  grabbed = new Rope(width / 2, 0, {
    length: 300,
    segments: 15,
    color: color(220, 60, 60),
    thickness: 4,
    showPoints: true,
  });
  ropes.push(grabbed);
}

function draw() {
  background(255);

  let mvx = mouseX - pmouseX;
  let mvy = mouseY - pmouseY;

  // Grab the end of the red rope while the mouse is held, let go on release
  if (mouseIsPressed) {
    grabbed.pinEnd(mouseX, mouseY);
  } else {
    grabbed.unpinEnd();
  }

  for (let rope of ropes) {
    rope.push(mouseX, mouseY, mvx, mvy, 120, 0.6);
    rope.update();
    rope.draw();
  }
}
