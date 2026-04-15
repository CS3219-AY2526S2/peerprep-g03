FROM node:alpine

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 3003

# Command to run the application
CMD ["npm", "run", "start"]
