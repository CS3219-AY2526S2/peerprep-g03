FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .

EXPOSE 3012

ENV HOST=0.0.0.0
ENV PORT=3012
CMD ["npx", "y-websocket"]
