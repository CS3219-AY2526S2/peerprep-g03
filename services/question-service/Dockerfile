# Use the official Node.js Alpine image for a lightweight container
FROM node:18-alpine

# Set the working directory inside the container
WORKDIR /app

# Copy package files first to leverage Docker cache for dependencies
COPY package*.json ./

# Install production dependencies
RUN npm install

# Copy the rest of the service source code
COPY . .

# Expose the port the Question Service runs on (Requirement NFR1.1)
EXPOSE 3001

# Start the application
CMD ["npm", "start"]