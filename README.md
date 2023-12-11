# sdxl Turbo FastApi Endpoint

## Overview

This is a FastApi endpoint for the sdxl Turbo model.
There is a single endpoint, `/`, where you can get the frontend.
A websocket is used to go between the frontend and the backend.

## Installation
1. Clone the repository or download the source code.

2. Install all required Python packages:
```bash
pip install -r requirements.txt
```

3. You can use the download.py script to download the model and the weights.
```bash
python3 download.py
```


## Running the Server

To run the server, execute the following from the root directory:

```bash
python3 app.py
```

## Testing the Server

click on the link in teh terminal when the app is running.
If you encounter errors regarding the loading of the camera, switch to localhost instead of "0.0.0.0".