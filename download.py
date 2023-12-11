import torch
from diffusers import AutoPipelineForText2Image, AutoPipelineForImage2Image

pipeline_text2image = AutoPipelineForText2Image.from_pretrained("stabilityai/sdxl-turbo", torch_dtype=torch.float16, variant="fp16")
pipeline_text2image = pipeline_text2image
pipeline = AutoPipelineForImage2Image.from_pipe(pipeline_text2image)