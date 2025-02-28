# Use an official SUSE Linux as a parent image
FROM opensuse/leap:15.6

# Update and install dependencies using zypper (SUSE's package manager)
RUN zypper refresh && \
    zypper install -y python3 python3-pip nodejs npm

# Set the working directory
WORKDIR /app

# Copy the frontend and backend directories into the container
COPY frontend ./frontend
COPY backend ./backend

# Install Node.js dependencies for the frontend
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

# Expose the ports for frontend and backend
EXPOSE 3000 8000

# Use the startup script as the command to run when the container starts
CMD ["./start.sh"]
