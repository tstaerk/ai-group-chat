FROM node:24-bookworm-slim
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev --ignore-scripts --no-audit --no-fund
COPY bot.mjs core.mjs ./
ENV NODE_ENV=production
USER node
CMD ["node", "bot.mjs"]
