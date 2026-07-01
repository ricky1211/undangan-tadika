FROM node:20-slim

WORKDIR /app

COPY package.json ./
RUN npm install --omit=dev

COPY . .

# Folder session Baileys perlu persistent volume di platform hosting
RUN mkdir -p /app/session

CMD ["node", "index.js"]
