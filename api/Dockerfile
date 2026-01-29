# Done by Wen Yi (24009255)

FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY src ./src

ENV NODE_ENV=production
ENV PORT=3000
USER node

EXPOSE 3000

CMD ["node", "src/server.js"]
