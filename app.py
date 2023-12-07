import uvicorn
from fastapi import FastAPI, Response, File, UploadFile
import io
import cv2
from PIL import Image
import numpy as np
import time

from diffusers import AutoPipelineForText2Image
import torch

from diffusers import AutoPipelineForImage2Image
from diffusers.utils import load_image, make_image_grid

pipeline_text2image = AutoPipelineForText2Image.from_pretrained("stabilityai/sdxl-turbo", torch_dtype=torch.float16, variant="fp16")
pipeline_text2image = pipeline_text2image.to("cuda")
pipeline = AutoPipelineForImage2Image.from_pipe(pipeline_text2image).to("cuda")
# pipeline.unet = torch.compile(pipeline.unet, mode="reduce-overhead", fullgraph=True)
# pipeline.upcast_vae()
app = FastAPI()

@app.get("/text2image/")
async def text2image(prompt:str, seed: int =-1):
    print("prompt is: ", prompt)
    print("seed is: ", seed)
    if seed != -1:
        torch.manual_seed(seed)
    start = time.time()
    image = pipeline_text2image(prompt=prompt, guidance_scale=0.0, num_inference_steps=1).images[0]
    print("time: ", time.time() - start)
    # print("im ",image)
    # Convert the PIL image to a format suitable for cv2
    image = np.array(image)
    image = cv2.cvtColor(image, cv2.COLOR_RGB2BGR)

    # Encode the image as PNG
    _, image_as_png = cv2.imencode('.png', image)
    image_as_png = image_as_png.tobytes()
    return Response(content=image_as_png, media_type="image/png")

@app.post("/image2image")
async def image2image(prompt: str, file: UploadFile = File(...), strength: float = 0.93, num_inference_steps: int = 2, seed: int =-1, noise:float =0.0, k:int = 0):
    content = await file.read()
    nparr = np.fromstring(content, np.uint8)
    init_image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    init_image += np.random.normal(0, 1, init_image.shape)* noise
    init_image = init_image.clip(0, 255).astype(np.uint8)
    if k > 0:
        coords = np.linspace(0, 255, k)
        init_image = np.digitize(init_image, coords, right=True)
        init_image = coords[init_image]
        init_image = init_image.astype(np.uint8)

    image = Image.fromarray(cv2.cvtColor(init_image, cv2.COLOR_BGR2RGB))
    print("prompt is: ", prompt)
    print("image is: ", image)
    if seed != -1:
        torch.manual_seed(seed)
    print("strength is: ", strength)
    print("num_inference_steps is: ", num_inference_steps)
    # print("init_image is: ", init_image)
    init_image = image.resize((512, 512))
    start = time.time()
    image = pipeline(prompt, image=init_image, strength=strength, guidance_scale=0.0, num_inference_steps=num_inference_steps).images[0]
    print("time: ", time.time() - start)
    # make_image_grid([init_image, image], rows=1, cols=2)
    # Convert the PIL image to a format suitable for cv2
    image = np.array(image)
    image = cv2.cvtColor(image, cv2.COLOR_RGB2BGR)

    # Encode the image as PNG
    _, image_as_png = cv2.imencode('.png', image)
    image_as_png = image_as_png.tobytes()

    return Response(content=image_as_png, media_type="image/png")

if __name__ == "__main__":
    uvicorn.run(app, port=8080, host="0.0.0.0")