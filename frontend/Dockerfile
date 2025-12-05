# frontend/Dockerfile
FROM node:20-alpine

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm install

COPY . .

# Vite default port
EXPOSE 5173

# Run dev server in container
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
