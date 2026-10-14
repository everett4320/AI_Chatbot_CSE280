FROM node:22-alpine AS development-dependencies-env
WORKDIR /app/ai-chatbot-lehigh
COPY ai-chatbot-lehigh/package.json ai-chatbot-lehigh/package-lock.json ./
RUN npm ci

FROM node:22-alpine AS production-dependencies-env
WORKDIR /app/ai-chatbot-lehigh
COPY ai-chatbot-lehigh/package.json ai-chatbot-lehigh/package-lock.json ./
RUN npm ci --omit=dev

FROM node:22-alpine AS build-env
ARG VITE_CHAT_API_URL
ARG VITE_CHAT_BOT_NAME
ARG VITE_BASE_PATH=/
ENV VITE_CHAT_API_URL=$VITE_CHAT_API_URL
ENV VITE_CHAT_BOT_NAME=$VITE_CHAT_BOT_NAME
ENV VITE_BASE_PATH=$VITE_BASE_PATH
WORKDIR /app/ai-chatbot-lehigh
COPY ai-chatbot-lehigh/ ./
COPY christopher-handoff/backend-inputs/SYSTEM_PROMPT.txt /app/christopher-handoff/backend-inputs/SYSTEM_PROMPT.txt
COPY --from=development-dependencies-env /app/ai-chatbot-lehigh/node_modules ./node_modules
RUN test "$VITE_BASE_PATH" = "/" || \
  (case "$VITE_BASE_PATH" in /*/) exit 0 ;; *) echo "VITE_BASE_PATH must start and end with /" >&2; exit 1 ;; esac)
RUN npm run verify:deployment

FROM node:22-alpine
ARG VITE_BASE_PATH=/
ENV NODE_ENV=production
ENV APP_BASE_PATH=$VITE_BASE_PATH
WORKDIR /app
COPY --chown=node:node ai-chatbot-lehigh/package.json ai-chatbot-lehigh/package-lock.json ./
COPY --chown=node:node --from=production-dependencies-env /app/ai-chatbot-lehigh/node_modules ./node_modules
COPY --chown=node:node --from=build-env /app/ai-chatbot-lehigh/build ./build
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s CMD ["sh", "-c", "wget -q -O /dev/null \"http://127.0.0.1:3000${APP_BASE_PATH}\" || exit 1"]
CMD ["npm", "run", "start"]
