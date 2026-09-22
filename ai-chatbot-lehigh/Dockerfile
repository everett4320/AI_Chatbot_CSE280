FROM node:22-alpine AS build-env

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

ARG VITE_CHAT_API_URL
ARG VITE_CHAT_BOT_NAME
ARG VITE_BASE_PATH=/
ENV VITE_CHAT_API_URL=$VITE_CHAT_API_URL
ENV VITE_CHAT_BOT_NAME=$VITE_CHAT_BOT_NAME
ENV VITE_BASE_PATH=$VITE_BASE_PATH

COPY . .
RUN test "$VITE_BASE_PATH" = "/" || \
  (case "$VITE_BASE_PATH" in /*/) exit 0 ;; *) echo "VITE_BASE_PATH must start and end with /" >&2; exit 1 ;; esac)
RUN npm run verify:deployment
RUN test -f /app/build/client/index.html

FROM httpd:2.4-alpine

ARG VITE_BASE_PATH=/
ENV APP_BASE_PATH=$VITE_BASE_PATH

COPY --from=build-env /app/build/client /tmp/ross-client
COPY apache/ross-spa.conf.template /tmp/ross-spa.conf.template

RUN set -eux; \
  rm -rf /usr/local/apache2/htdocs/*; \
  if [ "$APP_BASE_PATH" = "/" ]; then \
    document_root="/usr/local/apache2/htdocs"; \
    fallback="/index.html"; \
  else \
    relative_path="${APP_BASE_PATH#/}"; \
    relative_path="${relative_path%/}"; \
    document_root="/usr/local/apache2/htdocs/${relative_path}"; \
    fallback="${APP_BASE_PATH}index.html"; \
    mkdir -p "$document_root"; \
  fi; \
  cp -a /tmp/ross-client/. "$document_root/"; \
  sed \
    -e "s|__DOCUMENT_ROOT__|$document_root|g" \
    -e "s|__FALLBACK__|$fallback|g" \
    /tmp/ross-spa.conf.template \
    > /usr/local/apache2/conf/extra/ross-spa.conf; \
  printf '\nInclude conf/extra/ross-spa.conf\n' >> /usr/local/apache2/conf/httpd.conf; \
  test -f "$document_root/index.html"; \
  rm -rf /tmp/ross-client /tmp/ross-spa.conf.template

EXPOSE 80
HEALTHCHECK --interval=30s --timeout=5s CMD ["sh", "-c", "wget -q -O /dev/null \"http://127.0.0.1${APP_BASE_PATH}\" || exit 1"]
