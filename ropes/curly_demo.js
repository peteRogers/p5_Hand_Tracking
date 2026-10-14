// p5.js 2.x: using the Curly class from curly.js
// Move the mouse past the curlies to make them curl up.
// They curl away from the way you moved, then slowly unfurl.

let curlies = [];

function setup() {
  createCanvas(windowWidth, windowHeight);

  // A row of curlies hanging from the top, each a slightly different green
  for (let x = 10; x < width; x += 10) {
    curlies.push(new Curly(x, 0, {
      length: height * 0.6,
      color: color(random(30, 60), random(120, 170), random(50, 90)),
    }));
  }
}

function draw() {
  background(255);

  let mvx = mouseX - pmouseX;
  let mvy = mouseY - pmouseY;

  for (let curly of curlies) {
    curly.push(mouseX, mouseY, mvx, mvy, 60, 0.3);
    curly.update();
    curly.draw();
  }
}
