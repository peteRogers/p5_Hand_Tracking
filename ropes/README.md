# Ropes

Ropes that swing and hang, made with [p5.js](https://p5js.org/) 2.x. All the rope code lives in one `Rope` class in `rope.js`, so a sketch can make a rope in one line.

| File | What it does |
| ---- | ------------ |
| `rope.js` | The `Rope` class |
| `rope_class.html` | Mouse demo: push a row of ropes, and hold the mouse button to grab the end of the red rope |
| `ropes_hand.html` | Hand tracking demo: push the ropes with your index fingertip (uses [ml5.js](https://ml5js.org/)) |

## Quick start

Load `rope.js` before your own sketch in the HTML:

```html
<script src="https://cdn.jsdelivr.net/npm/p5@2.3.4/lib/p5.min.js"></script>
<script src="rope.js"></script>
<script src="sketch.js"></script>
```

Then make a rope, and update and draw it every frame:

```js
let rope;

function setup() {
  createCanvas(400, 400);
  rope = new Rope(200, 20);   // hangs straight down from (200, 20)
}

function draw() {
  background(240);
  rope.update();
  rope.draw();
}
```

The first point is pinned where you create the rope, so it hangs from there.

## Options

Pass an options object as the third argument. Every option is optional:

```js
let rope = new Rope(200, 0, {
  length: 300,
  segments: 15,
  color: color(220, 60, 60),
  thickness: 4,
});
```

| Option | Default | What it does |
| ------ | ------- | ------------ |
| `length` | `200` | Total length of the rope in pixels |
| `segments` | `10` | Number of sticks the rope is made of. More is smoother but slower |
| `gravity` | `0.5` | How hard the rope is pulled down each frame |
| `damping` | `0.99` | How long it keeps swinging. `1` swings forever, lower settles faster |
| `stiffness` | `5` | How many times per frame the sticks are fixed. More is less stretchy |
| `color` | `0` | Line colour. Anything `stroke()` accepts |
| `thickness` | `4` | Line thickness in pixels |
| `showPoints` | `false` | Draw a dot on every point |

The options become properties of the rope, so you can change them while the sketch runs:

```js
rope.gravity = -0.5;   // float upwards
rope.color = color(0, 150, 255);
rope.length = 100;     // shrink it
```

## Methods

### `update()` and `draw()`

Call `update()` once per frame to move the rope, then `draw()` to draw it.

### Pinning points

A pinned point stays still. The rope hangs from it.

| Method | What it does |
| ------ | ------------ |
| `pin(i, x, y)` | Pin point number `i`. If you give `x, y`, it also moves there |
| `unpin(i)` | Let point `i` move freely again |
| `pinStart(x, y)` / `unpinStart()` | The same, for the first point |
| `pinEnd(x, y)` / `unpinEnd()` | The same, for the last point |

Negative numbers count back from the end, so `pin(-1)` is the last point.

Grab the end of a rope with the mouse:

```js
if (mouseIsPressed) {
  rope.pinEnd(mouseX, mouseY);
} else {
  rope.unpinEnd();
}
```

Move the top of a rope around by pinning it somewhere new every frame:

```js
rope.pinStart(mouseX, mouseY);
```

Pin both ends to make a rope that sags between two points:

```js
rope.pinEnd(300, 50);
```

### Pushing

```js
rope.push(x, y, vx, vy, radius, strength);
```

`push()` drags the rope along with something moving through it, like the mouse or a fingertip:

- `x, y`: where it is
- `vx, vy`: how far it moved this frame
- `radius`: how far it reaches (default `100`)
- `strength`: how hard it pushes (default `0.5`)

Points closer to `x, y` get pushed harder. Pinned points never move. Call it before `update()`:

```js
rope.push(mouseX, mouseY, mouseX - pmouseX, mouseY - pmouseY, 120, 0.6);
rope.update();
```

`ropes_hand.js` does the same with the index fingertip of each hand instead of the mouse.

### Reading the points

| Property | What it is |
| -------- | ---------- |
| `rope.points` | Every point, from start to end. Each has `x` and `y` |
| `rope.start` | The first point |
| `rope.end` | The last point |
| `rope.segLen` | The length of one stick (`length / segments`) |

For example, to hang a ball on the end:

```js
circle(rope.end.x, rope.end.y, 30);
```

## How it works

The rope is a row of points joined by sticks. This is called Verlet physics. Each frame, `update()` does two things:

1. **Move every point.** Each point remembers where it was last frame (`px, py`). How far it moved since then is its speed. It keeps that speed (multiplied by `damping`) and falls a little more (`gravity`).
2. **Fix the sticks.** Moving the points stretches or squashes the sticks. For each pair of neighbours, measure how far apart they are, then move both points so the stick is the right length again. If one point is pinned, only the other one moves. Fixing one stick can break the one next to it, so this is repeated `stiffness` times.

`draw()` then draws a smooth curve through the points with `splineVertex()`.
