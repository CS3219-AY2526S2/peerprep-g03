FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .

EXPOSE 1234

ENV HOST=0.0.0.0
ENV PORT=1234
CMD ["npx", "y-websocket"]

##COPY . .
##EXPOSE 3000
##CMD ["npm", "start"]