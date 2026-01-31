FROM node:22-alpine

WORKDIR /app

# Expo in Docker: non-interactive (--host lan so host can reach dev server)
ENV CI=1

COPY package*.json ./

RUN npm install

COPY . .

# Expo dev server (19000) + Metro bundler (8081)
EXPOSE 19000 8081

CMD ["npx", "expo", "start", "--host", "lan"]
