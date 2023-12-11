let menuCanvas_width = 0;
let isDragging = false;
let pointIndex = null;
let points = [{x: 25, y: 25}, {x: 125, y: 125}, {x: 25, y: 125}, {x: 125, y: 25}];
const radius = 5;
const overlay = document.getElementById('overlay');
const video = document.createElement('video');
const image_canvas = document.getElementById('grayCanvas');
let lastRequest = null;
let ws = null; // Global WebSocket instance
const WS_URL = 'ws://localhost:8080/ws/image2image';
let debt=0;
// inputs 
const promptInput = document.getElementById('promptInput');
const strengthInput = document.getElementById('strengthInput');
const stepsInput = document.getElementById('iterationsInput');
const seedInput = document.getElementById('seedInput');
const noiseInput = document.getElementById('noiseInput');
const kInput = document.getElementById('kInput');
const debugInput = document.getElementById('debugInput');

function startWebcam() {
    // var video = document.createElement('video');

    // Get access to the webcam
    if (navigator.mediaDevices.getUserMedia) {
        navigator.mediaDevices.getUserMedia({ video: true })
            .then(function (stream) {
                video.srcObject = stream;
                video.play();
            })
            .catch(function (error) {
                console.log("Error accessing webcam: " + error);
            });
    }

    // Draw the video feed to the canvas
    var menuCanvas1 = document.getElementById('menuCanvas1');
    var context = menuCanvas1.getContext('2d');

    video.addEventListener('play', function() {
        function draw() {
            if (!video.paused && !video.ended) {
                context.clearRect(0, 0, menuCanvas1.width, menuCanvas1.height);
                context.drawImage(video, 0, 0, menuCanvas1.width, menuCanvas1.height);
                requestAnimationFrame(draw);
            }
        }
        draw();
    });
}

function startWebSocket() {
    ws = new WebSocket(WS_URL);

    ws.onopen = () => {
        console.log("WebSocket connection established");
    };

    ws.onclose = () => {
        console.log("WebSocket connection closed, attempting to reconnect...");
        setTimeout(startWebSocket, 3000); // Attempt to reconnect after 3 seconds
    };

    ws.onmessage = function(event) {
        debt--;
        // Handle the received image data here
        console.log('Image received from server. debt=', debt);
        const url = URL.createObjectURL(event.data);
        const img = new Image();
        img.onload = () => {
            // Get the context of the canvas
            const ctx = image_canvas.getContext('2d');
            // Draw the image onto the canvas
            ctx.drawImage(img, 0, 0, image_canvas.width, image_canvas.height);
            URL.revokeObjectURL(url); // Clean up memory
            lastRequest = null; // Reset the last request
        };
        img.src = url;
        // lastRequest = null; // Reset the last request
    };

    ws.onerror = function(error) {
        console.error('WebSocket Error: ' + error);
    };
}

function toggleMenu() {
    var menuContent = document.getElementById("menuContent");
    if (menuContent.style.display === "block") {
        menuContent.style.display = "none";
    } else {
        menuContent.style.display = "block";
        setCanvasSize();
    }
}

async function sendImage(imageData) {
    if (ws && ws.readyState === WebSocket.OPEN) {
        const data = {
            prompt: promptInput.value,
            strength: strengthInput.value,
            steps: stepsInput.value,
            seed: seedInput.value,
            noise: noiseInput.value,
            k: kInput.value,
            debug: debugInput.checked
        };

        const json = JSON.stringify(data);
        const combinedData = new Blob([json + '\n', new Blob([imageData])], {type: 'application/octet-stream'});
        debt++;
        ws.send(combinedData);
    } else {
        console.log("WebSocket is not open. Cannot send data.");
    }
}

function toggleExplanation() {
    var explanation = document.getElementById("explanationContent");
    if (explanation.style.display === "block") {
        explanation.style.display = "none";
    }
    else {
        explanation.style.display = "block";
    }
}

function setCanvasSize() {
    var canvasContainers = document.querySelectorAll('.canvas-container');
    canvasContainers.forEach(function(container) {
        var containerHeight = 8 * container.offsetHeight / 10;

        var canvas = container.getElementsByTagName('canvas')[0];
        canvas.style.width = containerHeight + 'px';
        canvas.style.height = containerHeight + 'px';
    });
}

function start(){
    setCanvasSize();
    startWebcam();
    startWebSocket();
    redrawCanvas();
    loopImages();
}

// Set canvas size on window load and resize
window.onload = start;
window.onresize = setCanvasSize;


function sortPoints() {
    // Sort points based on y-coordinates
    // points.sort((a, b) => a.y - b.y);
    points.sort((a, b) => a.y - b.y);

    // Split into top and bottom two points
    let topPoints = points.slice(0, 2);
    let bottomPoints = points.slice(2, 4);

    // Sort top and bottom pairs based on x-coordinates
    topPoints.sort((a, b) => a.x - b.x);
    bottomPoints.sort((a, b) => a.x - b.x);

    // Return the sorted points: top-left, top-right, bottom-left, bottom-right
    return [topPoints[0], topPoints[1], bottomPoints[0], bottomPoints[1]];
    // return [bottomPoints[1], bottomPoints[0], topPoints[1], topPoints[0] ];
}

function findPoint(x, y) {
    for (var i = 0; i < points.length; i++) {
        var point = points[i];
        if (Math.sqrt((point.x - x) ** 2 + (point.y - y) ** 2 )< radius*2) {
            return i;
        }
    }
    return null;
}

function drawPoint(x, y) {
    var context = overlay.getContext('2d');
    context.fillStyle = 'red';
    context.beginPath();
    context.arc(x, y, radius, 0, 2 * Math.PI);
    context.fill();
}

function drawRegion() {
    // sortPoints();
    var context = overlay.getContext('2d');
    // stroke color
    context.strokeStyle = 'red';
    context.lineWidth = 1;

    context.beginPath();
    context.moveTo(points[0].x, points[0].y);
    for (var i = 1; i < points.length; i++) {
        context.lineTo(points[i].x, points[i].y);
    }
    context.closePath();
    context.stroke();
}

function redrawCanvas() {
    var context = overlay.getContext('2d');
    context.clearRect(0, 0, overlay.width, overlay.height);
    if (!isDragging) {;
        sortPoints();
        cropAndDisplayArea();
    }
    drawRegion();
    points.forEach((p) => drawPoint(p.x, p.y));

    requestAnimationFrame(redrawCanvas);
}

function loopImages(){
        //  if we can send the image
        if (lastRequest === null ) {
            lastRequest = Date.now();
            whiteCanvas.toBlob(function(blob) {
                sendImage(blob);
            });
        } else if (lastRequest && Date.now() - lastRequest > 3000) {
            lastRequest = Date.now();
            whiteCanvas.toBlob(function(blob) {
                sendImage(blob);
            });
        }
        //  wait 3 seconds
        //  send the image
    setTimeout(loopImages, 100);
}

overlay.addEventListener('pointerdown', function(event) {
    isDragging = true;
    const x = event.offsetX - overlay.offsetLeft;
    const y = event.offsetY - overlay.offsetTop;
    pointIndex = findPoint(x, y);
});

overlay.addEventListener('pointerup', function(event) {
    isDragging = false;
    pointIndex = null;
});



overlay.addEventListener('pointermove', function(event) {
    if (isDragging && pointIndex !== null) {
        points[pointIndex].x = event.offsetX - overlay.offsetLeft;
        points[pointIndex].y = event.offsetY - overlay.offsetTop;
    }
});

function cropAndDisplayArea() {

    if (points.length === 4 && cv && cv.imread && video.readyState === 4) {
        var whiteCanvas = document.getElementById('whiteCanvas');
        // Sort points to ensure correct order
        let sortedPoints = sortPoints(points);
        // project point coordinates to camera
        sortedPoints = sortedPoints.map(p => {
            return {
                x: p.x * video.videoWidth / overlay.width,
                y: p.y * video.videoHeight / overlay.height
            };
        });

        // Create a temporary canvas to draw the video frame
        let tempCanvas = document.createElement("canvas");
        tempCanvas.width = video.videoWidth;
        tempCanvas.height = video.videoHeight;
        let tempCtx = tempCanvas.getContext("2d");
        tempCtx.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);

        // Read the image from the temporary canvas
        let src = cv.imread(tempCanvas);
        let dst = new cv.Mat();

        // Define the destination size and the points for perspective transformation
        let dsize = new cv.Size(whiteCanvas.width, whiteCanvas.height);
        let srcTri = cv.matFromArray(4, 1, cv.CV_32FC2, sortedPoints.flatMap(p => [p.x, p.y]));

        // Make sure the destination points match the order of the source points
        let dstTri = cv.matFromArray(4, 1, cv.CV_32FC2, [0, 0, dsize.width, 0, 0, dsize.height, dsize.width, dsize.height]);

        // Compute the transformation matrix
        let M = cv.getPerspectiveTransform(srcTri, dstTri);

        // Perform the warp perspective transformation
        cv.warpPerspective(src, dst, M, dsize, cv.INTER_LINEAR, cv.BORDER_CONSTANT, new cv.Scalar());

        // Use cv.imshow to draw the transformed image to the white canvas
        cv.imshow("whiteCanvas", dst);

        // Clean up
        src.delete();
        dst.delete();
        M.delete();
        srcTri.delete();
        dstTri.delete();
        tempCanvas.remove();
    } else {
        console.log("Conditions for cropping not met or OpenCV not ready");
    }
}
