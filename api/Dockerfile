FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

COPY src ./src

ENV PORT=3000
ENV DB_FILE=/data/inventory.sqlite

RUN addgroup -S app && adduser -S app -G app
USER app

EXPOSE 3000

CMD ["node", "src/server.js"]