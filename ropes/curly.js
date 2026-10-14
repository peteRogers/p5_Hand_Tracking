// A rope that hangs straight down, then curls up like a fern frond when
// something moves past it, and slowly unfurls again.
// Load rope.js first: Curly is built on top of the Rope class, so it can do
// everything a Rope can (pin, push, draw...) plus curl.
//
//   let curly = new Curly(200, 0, { length: 300 });
//
//   function draw() {
//     curly.push(mouseX, mouseY, mouseX - pmouseX, mouseY - pmouseY);
//     curly.update();
//     curly.draw();
//   }

class Curly extends Rope {
  constructor(x, y, options = {}) {
    // Every curly is a little different. variation: 0.2 means each setting
    // below can be up to 20% bigger or smaller than you asked for. 0 = all the same.
    let variation = options.variation ?? 0.2;
    let vary = (value) => value * (1 + (Math.random() * 2 - 1) * variation);

    // Curlies need more segments than a plain rope to make a smooth spiral
    super(x, y, {
      segments: 30,
      gravity: 0.2,
      damping: 0.95,
      ...options,
      length: vary(options.length ?? 300),
      thickness: vary(options.thickness ?? 6),
    });

    this.angle = options.angle ?? Math.PI / 2;            // direction it hangs, straight down by default
    this.turns = vary(options.turns ?? 2);                // how many times it winds round when fully curled
    this.tightenTurns = vary(options.tightenTurns ?? 0.5); // extra turns it slowly winds in while it stays curled
    this.bendStrength = options.bendStrength ?? 0.5;      // how firmly it holds its shape (0 to 1)
    this.curlSpeed = vary(options.curlSpeed ?? 0.12);     // how fast it curls up after a fast push
    this.unfurlSpeed = vary(options.unfurlSpeed ?? 0.01); // how fast it unfurls after a fast push
    this.holdTime = vary(options.holdTime ?? 60);         // frames to stay curled after a push at 10 pixels/frame. Infinity = stay curled
    this.fastPush = vary(options.fastPush ?? 15);         // pushes slower than this (pixels/frame) curl more slowly and unfurl sooner and quicker
    this.variation = variation;

    // Swaying, like a plant in a light breeze
    this.sway = vary(options.sway ?? 0.15);               // how far the tip sways, in radians. 0 = still
    this.swaySpeed = vary(options.swaySpeed ?? 0.02);     // how fast it sways
    this.swayOffset = Math.random() * 1000;               // so they don't all sway together
    this.time = 0;

    this.curl = 0;            // 0 = straight, 1 = fully curled
    this.tighten = 0;         // 0 to 1, how far it has wound in its tightenTurns
    this.curling = false;     // true while curling up or holding, false while unfurling
    this.curlRate = this.curlSpeed;     // speeds for the current curl, set by the push
    this.unfurlRate = this.unfurlSpeed;
    this.direction = 1;       // 1 curls one way, -1 the other
    this.holdTimer = 0;
  }

  // --- Curling ---------------------------------------------------------------

  // Start curling. direction is 1 or -1, and only changes while it's straight,
  // so it doesn't flip over halfway through a curl.
  // hold is how many frames to stay curled before unfurling. It's varied a
  // little each time, so curlies hit together don't all unfurl together.
  // speed is how hard it was pushed, from 0.1 (gentle) to 1 (fast). A gentle
  // push curls it up more slowly, then it unfurls quicker.
  curlUp(direction = this.direction, hold = this.holdTime, speed = 1) {
    if (this.curl < 0.05) {
      this.direction = direction;
      this.tighten = 0;
    }
    speed = constrain(speed, 0.1, 1);
    this.curling = true;
    this.curlRate = this.curlSpeed * speed;
    this.unfurlRate = this.unfurlSpeed * (1 + 2 * (1 - speed)); // up to 3x quicker
    this.holdTimer = hold * (1 + (Math.random() * 2 - 1) * this.variation * 2);
  }

  // Start unfurling straight away
  unfurl() {
    this.curling = false;
    this.holdTimer = 0;
  }

  // Push the rope like a Rope does, and curl up if the thing is moving and
  // close enough. It curls away from the side it was pushed from.
  // It always curls all the way up, but how fast depends on the push:
  // - a push at fastPush or faster curls at full curlSpeed. Slower pushes curl
  //   up more slowly, and then unfurl quicker.
  // - a push at 10 pixels per frame holds for holdTime, twice as fast holds
  //   twice as long (up to 4x), slower holds for less.
  // Once it starts curling, pushes are ignored until it has completely
  // unfurled again.
  push(x, y, vx, vy, radius = 100, strength = 0.5) {
    if (this.curl > 0 || this.curling) return;

    super.push(x, y, vx, vy, radius, strength);

    let speed = sqrt(vx * vx + vy * vy);
    if (speed < 1) return;
    for (let p of this.points) {
      if (dist(p.x, p.y, x, y) < radius) {
        let hold = this.holdTime * constrain(speed / 10, 0.25, 4);
        this.curlUp(vx > 0 ? -1 : 1, hold, speed / this.fastPush);
        return;
      }
    }
  }

  // --- Simulation ------------------------------------------------------------

  update() {
    this.time++;

    if (this.curling) {
      // Each frame, close part of the gap to fully curled. It curls quickly at
      // first and keeps slowly tightening, slower and slower, until it unfurls.
      this.curl += (1 - this.curl) * this.curlRate;

      // At the same time, slowly wind in a little more, so it never quite
      // stops moving. This is much slower, so it carries on while it's held.
      this.tighten += (1 - this.tighten) * this.curlRate * 0.15;

      // Once it's nearly all the way, count down the hold time
      if (this.curl > 0.95) {
        this.holdTimer--;
        if (this.holdTimer <= 0) this.curling = false;
      }
    } else {
      this.curl = max(this.curl - this.unfurlRate, 0);
    }

    // Swing and fall exactly like a Rope. Rope.update() calls fixShape()
    // below to fix the sticks.
    super.update();
  }

  // Bend each joint towards the angle it should have, then fix the sticks
  // like a Rope.
  // The bend gets stronger towards the tip, which makes a spiral, and
  // k is chosen so the bends add up to `turns` full turns, plus however much
  // of `tightenTurns` it has wound in so far.
  fixShape() {
    let n = this.segments;
    let segLen = this.segLen;
    let totalTurns = this.turns + this.tightenTurns * this.tighten;
    let k = (totalTurns * TWO_PI) / ((n + 1) / 2);

    // Sway: two sine waves at different speeds mixed together, so it never
    // quite repeats. When straight, the sway is spread evenly over the joints
    // so the whole length bends. As it curls, more of the sway moves to the top
    // joint, so the coil swings from the top like a pendulum.
    let t = (this.time + this.swayOffset) * this.swaySpeed;
    let swayAngle = this.sway * (sin(t) + 0.5 * sin(t * 2.3)) / 1.5;
    let swayPerJoint = (swayAngle * (1 - this.curl)) / n;
    let swayAtTop = swayAngle * this.curl * 1.5;

    let angle = this.angle;
    for (let i = 0; i < n; i++) {
      let a = this.points[i];
      let b = this.points[i + 1];
      let u = (i + 1) / n; // 0 at the base, 1 at the tip

      // The tip curls first and the curl rolls up towards the base
      let jointCurl = constrain(this.curl * 2 - (1 - u), 0, 1);
      let target = angle + jointCurl * k * u * this.direction + swayPerJoint;
      if (i === 0) target += swayAtTop;

      // Turn the stick part of the way towards its target angle. Everything
      // past this joint turns with it, like bending a real joint, so the rest
      // of the rope keeps its shape instead of being dragged out of place.
      let current = atan2(b.y - a.y, b.x - a.x);
      if (!b.pinned) {
        let turn = atan2(sin(target - current), cos(target - current)) * this.bendStrength;
        current += turn;
        b.x = a.x + cos(current) * segLen;
        b.y = a.y + sin(current) * segLen;
        this.rotateFrom(i + 2, a, turn);
      }

      // The next joint bends from the direction this stick actually points
      angle = current;
    }

    super.fixShape();
  }

  // Turn every point from index `start` to the tip around point c by `turn`
  // radians. Pinned points stay put.
  rotateFrom(start, c, turn) {
    let cs = cos(turn);
    let sn = sin(turn);
    for (let j = start; j < this.points.length; j++) {
      let p = this.points[j];
      if (p.pinned) continue;
      let dx = p.x - c.x;
      let dy = p.y - c.y;
      p.x = c.x + dx * cs - dy * sn;
      p.y = c.y + dx * sn + dy * cs;
    }
  }
}
