// p5.js 2.x + ml5.js 1.x hand tracking
// Labels each of the 21 hand keypoints with its index number.

let handPose;
let video;
let hands = [];

async function setup() {
  createCanvas(1280, 720);

  video = createCapture(VIDEO, { flipped: true });
  video.size(1280, 720);
  video.hide();

  // In p5 2.x there is no preload(), so await the model in setup()
  handPose = await ml5.handPose({ flipped: true });
  handPose.detectStart(video, gotHands);
}

function gotHands(results) {
  hands = results;
}

function draw() {
  if (!video) return;
  image(video, 0, 0, width, height);

  textSize(16);
  textAlign(CENTER, CENTER);

  for (let hand of hands) {
    for (let i = 0; i < hand.keypoints.length; i++) {
      let kp = hand.keypoints[i];

      noStroke();
      fill(0, 255, 0);
      circle(kp.x, kp.y, 8);

      stroke(0);
      strokeWeight(3);
      fill(255);
      text(i, kp.x + 12, kp.y - 12);
    }
  }
}
