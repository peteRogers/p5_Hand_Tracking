# p5.strands

p5.strands is a way to write shaders in plain JavaScript, built into [p5.js](https://p5js.org/) 2.x.

A shader is a small program that runs on the graphics card (GPU). It works out the colour of every pixel at the same time, so it can do effects across the whole screen that would be far too slow in a normal `draw()` loop. Shaders are usually written in a separate language called GLSL. With strands you write a normal JavaScript function and p5 turns it into a shader for you.

| File | What it does |
| ---- | ------------ |
| `strands_simple.html` | The simplest example: makes the canvas wobble like it's under water. Move the mouse to change the strength |
| `strands_hand.html` | Hand tracking with [ml5.js](https://ml5js.org/): blue flames on your fingertips, or a magnifying lens you resize with a pinch |

## How it works

There are three steps: build the shader once, draw as normal, then run the shader over the canvas with `filter()`.

```js
let myShader;

function setup() {
  createCanvas(400, 400);
  myShader = buildFilterShader(myEffect);   // 1. build it once
}

function draw() {
  background(0);
  circle(200, 200, 200);                    // 2. draw as normal
  filter(myShader);                         // 3. run it over the canvas
}

// Runs once for every pixel
function myEffect() {
  filterColor.begin();
  let uv = filterColor.texCoord;            // where this pixel is, 0 to 1
  let colour = getTexture(filterColor.canvasContent, uv);  // what was drawn there
  filterColor.set([1 - colour.r, 1 - colour.g, 1 - colour.b, 1]);  // invert it
  filterColor.end();
}
```

Inside the shader function:

- **`filterColor.begin()` and `filterColor.end()`** go around the code that works out each pixel's colour.
- **`filterColor.texCoord`** is where the current pixel is, from 0 to 1 across (`.x`) and down (`.y`) the canvas.
- **`filterColor.canvasContent`** is everything drawn so far. `getTexture(filterColor.canvasContent, position)` reads the colour at a position.
- **`filterColor.set([r, g, b, a])`** sets this pixel's colour. Colours go from 0 to 1, not 0 to 255.

## Passing values in

The shader can't see your sketch's variables directly. To use one, wrap it in a uniform, which sends the value to the shader every frame:

```js
let strength = uniformFloat(() => mouseX / width);    // one number
let centre = uniformVec2(() => [mouseX, mouseY]);    // two numbers
```

`millis()` works inside the shader on its own, so you can animate with time without a uniform.

## Things to know

- Maths functions like `sin()`, `mix()`, `smoothstep()`, `length()` and `noise()` work inside the shader, and run on the GPU.
- Not everything works in a shader. You can't draw shapes or call most p5 functions there. It only works out colours.
- Shaders run once per pixel, so on big or high resolution screens they can get slow. `pixelDensity(1)` in `setup()` helps.
- strands is still marked beta in p5.js, so the details may change. See the [p5.js reference](https://p5js.org/reference/p5/buildFilterShader/) for more.
