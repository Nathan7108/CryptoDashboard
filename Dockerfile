# Use an official Node runtime as a parent image
FROM node:16-alpine

# Install Python (if not already present)
RUN apk add --no-cache python3 py3-pip

# Set the working directory
WORKDIR /app

# Copy the frontend and backend directories into the container
COPY frontend ./frontend
COPY backend ./backend

# Install Node dependencies for the frontend
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install

# Install Python dependencies for the backend
WORKDIR /app/backend
COPY backend/requirements.txt ./
RUN pip3 install -r requirements.txt

# Return to the root directory
WORKDIR /app

# Copy the startup script and ensure it's executable
COPY start.sh ./
RUN chmod +x start.sh

# Expose the port (assuming your frontend runs on port 3000)
EXPOSE 3000

# Use the startup script as the command to run when the container starts
CMD ["./start.sh"]