FROM node:20-alpine
WORKDIR /app

# Manifests first, install, then source — the npm ci layer stays cached
# while source edits rebuild instantly.
COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

EXPOSE 5000
CMD ["node", "server.js"]
