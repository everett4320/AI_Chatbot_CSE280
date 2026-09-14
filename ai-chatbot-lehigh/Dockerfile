FROM node:22-alpine AS development-dependencies-env
WORKDIR /app
COPY ./package.json package-lock.json /app/
RUN npm ci

FROM node:22-alpine AS production-dependencies-env
COPY ./package.json package-lock.json /app/
WORKDIR /app
RUN npm ci --omit=dev

FROM node:22-alpine AS build-env
ARG VITE_CHAT_API_URL
ARG VITE_CHAT_BOT_NAME
ARG VITE_BASE_PATH=/
ENV VITE_CHAT_API_URL=$VITE_CHAT_API_URL
ENV VITE_CHAT_BOT_NAME=$VITE_CHAT_BOT_NAME
ENV VITE_BASE_PATH=$VITE_BASE_PATH
COPY . /app/
COPY --from=development-dependencies-env /app/node_modules /app/node_modules
WORKDIR /app
RUN test "$VITE_BASE_PATH" = "/" || \
  (case "$VITE_BASE_PATH" in /*/) exit 0 ;; *) echo "VITE_BASE_PATH must start and end with /" >&2; exit 1 ;; esac)
RUN npm run verify:deployment

FROM node:22-alpine
ARG VITE_BASE_PATH=/
ENV NODE_ENV=production
ENV APP_BASE_PATH=$VITE_BASE_PATH
WORKDIR /app
COPY --chown=node:node ./package.json package-lock.json /app/
COPY --chown=node:node --from=production-dependencies-env /app/node_modules /app/node_modules
COPY --chown=node:node --from=build-env /app/build /app/build
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s CMD ["sh", "-c", "wget -q -O /dev/null \"http://127.0.0.1:3000${APP_BASE_PATH}\" || exit 1"]
CMD ["npm", "run", "start"]
