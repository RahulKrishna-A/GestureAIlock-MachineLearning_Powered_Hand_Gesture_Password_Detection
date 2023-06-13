import {
    HandLandmarker,
    FilesetResolver
} from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0";

const passcode = [1, 2, 3, 4];
let passcheck = []
let handLandmarker = undefined;
let runningMode = "IMAGE";
let webcamRunning = false;

// Before we can use HandLandmarker class we must wait for it to finish
// loading. Machine Learning models can be large and take a moment to
// get everything needed to run.
const createHandLandmarker = async () => {
    const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm"
    );
    handLandmarker = await HandLandmarker.createFromOptions(vision, {
        baseOptions: {
            modelAssetPath: `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`,
            delegate: "GPU"
        },
        runningMode: runningMode,
        numHands: 1
    });

};
createHandLandmarker();


const video = document.getElementById("webcam");
const canvasElement = document.getElementById(
    "output_canvas"
);
const canvasCtx = canvasElement.getContext("2d");
const hasGetUserMedia = () => !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);

let enableWebcamButton = document.getElementById("webcamButton");
if (hasGetUserMedia()) {
    let enableWebcamButton = document.getElementById("webcamButton");
    enableWebcamButton.addEventListener("click", enableCam);
} else {
    console.warn("getUserMedia() is not supported by your browser");
}

function enableCam(event) {
    if (!handLandmarker) {
        console.log("Wait! objectDetector not loaded yet.");
        return;
    }

    if (webcamRunning === true) {
        webcamRunning = false;
        enableWebcamButton.innerText = "CAMERA ENABLED";
    } else {
        webcamRunning = true;
        enableWebcamButton.innerText = "CAMERA ENABLED";
    }

    // getUsermedia parameters.
    const constraints = {
        video: true
    };

    // Activate the webcam stream.
    navigator.mediaDevices.getUserMedia(constraints).then((stream) => {
        video.srcObject = stream;
        video.addEventListener("loadeddata", predictWebcam);
    });
}

// ---------------------------------

let lastVideoTime = -1;
let results = undefined;
let count = 0;
let prev = 1;

const tipids = [4, 8, 12, 16, 20];

async function predictWebcam() {
    canvasElement.style.width = video.videoWidth;
    canvasElement.style.height = video.videoHeight;
    canvasElement.width = video.videoWidth;
    canvasElement.height = video.videoHeight;

    // Now let's start detecting the stream.
    if (runningMode === "IMAGE") {
        runningMode = "VIDEO";
        await handLandmarker.setOptions({runningMode: "VIDEO"});
    }
    let startTimeMs = performance.now();
    if (lastVideoTime !== video.currentTime) {
        lastVideoTime = video.currentTime;
        results = handLandmarker.detectForVideo(video, startTimeMs);
    }

    canvasCtx.save();
    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);


    if (results.landmarks) {
        const lmlist1 = [];
        for (const landmarks of results.landmarks) {
            // drawConnectors(canvasCtx, landmarks, HAND_CONNECTIONS, {
            //     color: "#00FF00",
            //     lineWidth: 5
            // });
            lmlist1.push(landmarks)

            drawLandmarks(canvasCtx, landmarks, {color: "#FF0000", lineWidth: 2});
        }
        let lmlist = []
        if (lmlist1.length !== 0) {
            lmlist = lmlist1[0];

        }

        const fingerlist = [];
        if (lmlist.length !== 0 && lmlist.length === 21) {


            if (lmlist[12].x > lmlist[20].x) {

                if (lmlist[tipids[0]].x > lmlist[tipids[0] - 1].x) {
                    fingerlist.push(1);
                } else {
                    fingerlist.push(0);
                }
            } else {
                // console.log(lmlist[4].x)
                if (lmlist[tipids[0]].x < lmlist[tipids[0] - 1].x) {

                    fingerlist.push(1);
                } else {
                    fingerlist.push(0);
                }
            }
            for (let i = 1; i < 5; i++) {
                if (lmlist[tipids[i]].y < lmlist[tipids[i] - 2].y) {
                    fingerlist.push(1);
                } else {
                    fingerlist.push(0);
                }
            }
        }
        // console.log(fingerlist)

        let ones = fingerlist.filter(function (num) {
            return num === 1
        })
        let num = ones.length
        if (num > 0) {
            if (prev === num) {
                count += 1
            } else {
                count = 0
                prev = num
            }
        }
        if (count >= 20) {
            count = 0
            addKey(num)
        }

    }

    canvasCtx.restore();

    // Call this function again to keep predicting when the browser is ready.
    if (webcamRunning === true) {
        window.requestAnimationFrame(predictWebcam);
    }
}


const addKey = (dig) => {
    let passlength = passcheck.length;
    let oglength = passcode.length;
    render()
    if (passlength !== 0 && passlength < oglength) {
        if (dig !== passcheck[passlength - 1]) {
            passcheck.push(dig)
        }

    } else if (passlength === 0) {
        passcheck.push(dig)
    } else {
        if (JSON.stringify(passcheck) === JSON.stringify(passcode)) {
            console.log("----------------------you did it----------------------------");
            displayoutputs(1);
        } else {
            displayoutputs(0);
        }
    }
    // console.log(passcheck)
}


//----------------------------render


let password_container = document.getElementById("password_container");
const reset_btn = document.getElementById("reset_button");
const result_message = document.getElementById("result_message");

const render = () => {
    password_container.innerHTML = "";
    for (let i = 0; i < passcheck.length; i++) {
        password_container.innerHTML += passcheck[i];
    }
}

reset_btn.addEventListener("click", () => {
    passcheck = [];
    // console.log("a")
    render();
    result_message.innerHTML="";
})

const displayoutputs = (res) => {
    if (res === 1) {
        result_message.innerHTML = "Password Correct";
    } else {
        result_message.innerHTML = "Password Wrong";
    }
}