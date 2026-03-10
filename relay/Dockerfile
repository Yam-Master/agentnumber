FROM node:22-slim AS builder
WORKDIR /app
COPY package.json ./
RUN npm install
COPY tsconfig.json server.ts tunnel.ts ./
RUN npx tsc

FROM node:22-slim
WORKDIR /app
COPY --from=builder /app/dist/server.js ./
COPY --from=builder /app/node_modules ./node_modules
EXPOSE 8080
CMD ["node", "server.js"]
