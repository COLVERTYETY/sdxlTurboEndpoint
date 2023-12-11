from fastapi import FastAPI, WebSocket
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
import numpy as np
import cv2
from PIL import Image
import torch
import time
import base64
import json
from starlette.websockets import WebSocketDisconnect

import numpy as np

import torch
from diffusers import AutoPipelineForText2Image, AutoPipelineForImage2Image

device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

pipeline_text2image = AutoPipelineForText2Image.from_pretrained("stabilityai/sdxl-turbo", torch_dtype=torch.float16, variant="fp16")
pipeline_text2image = pipeline_text2image.to(device)
pipeline = AutoPipelineForImage2Image.from_pipe(pipeline_text2image).to(device)
# pipeline.unet = torch.compile(pipeline.unet, mode="reduce-overhead", fullgraph=True)
# pipeline.unet = torch.compile(pipeline.unet, mode="reduce-overhead", fullgraph=True)
# pipeline.vae = torch.compile(pipeline.vae, mode="reduce-overhead", fullgraph=True)
# pipeline.upcast_vae()

app = FastAPI()

html=""
with open("static/index.html", "r") as f:
    html = f.read()

# Mounting the static directory
app.mount("/static", StaticFiles(directory="static"), name="static")

@app.get("/", response_class=HTMLResponse)
async def root():
    return HTMLResponse(content=html, status_code=200)

@app.websocket("/ws/image2image")
async def websocket_image2image(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            # Receive data from the client (binary data)
            data = await websocket.receive_bytes()
            start = time.time()
            # The first part of the data is JSON, the second part is the image
            json_data, file_bytes = data.split(b'\n', 1)
            data = json.loads(json_data)

            prompt = data['prompt']
            strength = float(data['strength'])
            num_inference_steps = int(data['steps'])
            seed = int(data['seed'])
            noise = float(data['noise'])
            k = int(data['k'])
            # width = int(data['width'])
            # height = int(data['height'])
            debug = data['debug']

            # Decode the image
            # file_bytes = base64.b64decode(file)
            # nparr = np.frombuffer(file_bytes, np.uint8)
            # init_image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            # Decode the image
            nparr = np.frombuffer(file_bytes, np.uint8)
            init_image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)


            # Check if the image is successfully loaded
            if init_image is None:
                print("Failed to decode image")
                continue

            # Convert to RGB
            # nparr = np.array(cv2.cvtColor(init_image, cv2.COLOR_BGR2RGB))
            nparr = np.array(init_image)
            # init_image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

            print("CONFIGURATION: ")
            print("prompt is: ", prompt)
            print("strength is: ", strength)
            print("num_inference_steps is: ", num_inference_steps)
            print("seed is: ", seed)
            print("noise is: ", noise)
            print("k is: ", k)
            print("debug ? ", debug)

            
            
            if seed != -1:
                torch.manual_seed(seed)
                np.random.seed(seed)
            else:
                torch.manual_seed(int(time.time()))
                np.random.seed(int(time.time()))

            # color quantization
            if k > 1:
                if k == 2:
                    # For k=2, map pixel values to either 0 or 255 based on a threshold of 127
                    # nparr = np.where(nparr <= 127, 0, 255)
                    mean = np.mean(nparr)
                    nparr = np.where(nparr <= mean, 0, 255)
                else:
                    # For k>2, use the original method
                    coords = np.linspace(0, 255, k)
                    nparr = np.digitize(nparr, coords, right=True)
                    nparr = coords[nparr]
                nparr = nparr.astype(np.uint8)

            #  texture noise
            nparr = (nparr +np.random.normal(0, 1, nparr.shape)* noise).clip(0, 255).astype(np.uint8)
            # image = Image.fromarray(cv2.cvtColor(nparr, cv2.COLOR_BGR2RGB))
            # print(nparr.shape)
            image  = Image.fromarray(nparr)

            # resize
            init_image = image.resize((512, 512))
            print("start inference")
            image = pipeline(prompt, image=init_image, strength=strength, guidance_scale=0.0, num_inference_steps=num_inference_steps).images[0]
            end = time.time()
            # Once processing is done, convert image to binary and send it back
            _, buffer = cv2.imencode('.png', np.array(image))
            await websocket.send_bytes(buffer.tobytes())
            end_ = time.time()
            print("processing+inference: ", end - start)
            print("total: ", end_ - end)

            if debug:
                # save to file
                init_image.save(f"static/input.png")
                image.save(f"static/output.png")
                print("saved input and output")

    except WebSocketDisconnect:
        print("Client disconnected with code 1000 (normal closure)")
        # Handle any cleanup here if necessary

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8080)
