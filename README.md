# sdxl Turbo FastApi Endpoint

## Overview

This application is a FastAPI server that enables users to generate images using text and image prompts, using a stability.ai model.
The server can handle two types of requests: generating an image from text (`/text2image/`) and modifying an existing image based on a text prompt (`/image2image`).


## Installation

1. Install all required Python packages:
   ```bash
   pip install -r requirements.txt
   ```

2. Clone the repository or download the source code.

## Running the Server

To start the server, navigate to the directory containing the application and run:

```bash
uvicorn app:app --port 8080 --host 0.0.0.0
```

This will start the FastAPI server on port `8080`.

## Endpoints

### 1. Generate Image from Text (`/text2image/`)

- **Method**: GET
- **Parameters**:
  - `prompt`: The text prompt based on which the image will be generated.
  - `seed`: (Optional) Seed for random number generation to ensure reproducibility.
- **Response**: An image generated from the text prompt.

### 2. Modify Image Based on Text Prompt (`/image2image`)

- **Method**: POST
- **Body**:
  - `prompt`: The text prompt that guides the image modification.
  - `file`: The original image to be modified.
  - `strength`: The degree of modification applied to the original image.
  - `num_inference_steps`: Number of steps for the inference process.
  - `seed`: (Optional) Seed for random number generation.
- **Response**: The modified image based on the text prompt.

## Notes

- Ensure you have a suitable GPU for running the AI models, as the code uses CUDA for computations.
- The API is designed to handle one request at a time due to GPU memory limitations.
- The server is configured to run locally. For deployment, consider securing the endpoints and managing resource allocation.