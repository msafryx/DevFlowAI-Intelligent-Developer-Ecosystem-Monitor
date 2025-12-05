# backend/Dockerfile
FROM node:20-alpine

# Create app directory
WORKDIR /usr/src/app

# Install dependencies
COPY package*.json ./
RUN npm install --production

# Copy source
COPY . .

# Expose backend port
EXPOSE 5000

# Start server
CMD ["node", "server.js"]
