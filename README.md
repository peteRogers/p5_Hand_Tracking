# p5 Hand Tracking

Hand tracking sketches made with [p5.js](https://p5js.org/) 2.x and [ml5.js](https://ml5js.org/) 1.x.

Open `index.html` to run the basic sketch, which labels every hand keypoint with its number. The other `.html` files are separate experiments, for example `labubu.html`. The `ropes` and `strands` folders hold more experiments, each with its own README.

## The model

ml5's [`handPose`](https://docs.ml5js.org/#/reference/handpose) runs the TensorFlow.js
[Hand Pose Detection model](https://github.com/tensorflow/tfjs-models/tree/master/hand-pose-detection)
(MediaPipe Hands) in the browser. For each hand it finds, it returns 21 keypoints with `x` and `y` positions on the video.

## Keypoints

![The 21 hand keypoints](hand_keypoints.png)

Each finger has four points. They run from the knuckle (MCP) out to the tip, and 0 is the wrist.

| Finger | Keypoints |
| ------ | --------- |
| Wrist  | 0 |
| Thumb  | 1, 2, 3, 4 |
| Index  | 5, 6, 7, 8 |
| Middle | 9, 10, 11, 12 |
| Ring   | 13, 14, 15, 16 |
| Pinky  | 17, 18, 19, 20 |

In a sketch, you can get a keypoint by its number or by its name:

```js
let tip = hand.keypoints[8];    // index finger tip
let same = hand.index_finger_tip;
circle(tip.x, tip.y, 10);
```
