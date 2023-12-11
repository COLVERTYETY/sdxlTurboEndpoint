# Use an official CUDA runtime as a parent image
FROM nvidia/cuda:12.0.1-base-ubuntu22.04

# Set the working directory in the container
WORKDIR /usr/src/app

# Install Python
RUN apt-get update && apt-get install -y python3-pip

# Copy the current directory contents into the container at /usr/src/app
COPY . /usr/src/app

# Install any needed packages specified in requirements.txt
RUN pip3 install -r requirements.txt

# Install the model
RUN python3 /usr/src/download.py

# Make port 8080 available to the world outside this container
EXPOSE 8080

# Define environment variable
ENV NAME World

# Run app.py when the container launches
CMD ["python3", "app.py"]
