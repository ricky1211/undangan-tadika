FROM node:20-slim

RUN apt-get update && apt-get install -y git && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json ./
RUN npm install --omit=dev

COPY . .

# Folder session Baileys perlu persistent volume di platform hosting
RUN mkdir -p /app/session

CMD ["node", "index.js"]
