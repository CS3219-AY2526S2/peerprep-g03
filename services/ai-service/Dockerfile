# Use a lightweight Node.js image
FROM node:18-alpine

# Set the working directory inside the container
WORKDIR /app

# Copy package files first to optimize Docker caching
COPY package*.json ./

# Install dependencies
RUN npm install --production

# Copy the rest of the source code
COPY . .

# The port the service runs on (matches your compose file)
EXPOSE 3006

# Start the application
CMD ["node", "index.js"]