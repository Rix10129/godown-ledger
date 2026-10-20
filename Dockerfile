# Copy matching Debian TLS libraries from the verified full Node image into the smaller base.
FROM node:22-bookworm AS tls
FROM node:22-bookworm-slim AS base
COPY --from=tls /usr/lib/*-linux-gnu/libssl.so.3 /usr/lib/*-linux-gnu/libcrypto.so.3 /usr/lib/
COPY --from=tls /usr/bin/openssl /usr/bin/openssl
COPY --from=tls /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/ca-certificates.crt
WORKDIR /app
RUN openssl version && test -f /etc/ssl/certs/ca-certificates.crt
FROM base AS build
COPY package*.json ./
RUN --mount=type=secret,id=build_ca,target=/tmp/build-ca.pem \
    --mount=type=secret,id=build_https_proxy,target=/tmp/build-https-proxy \
    if [ -f /tmp/build-https-proxy ]; then export HTTPS_PROXY="$(cat /tmp/build-https-proxy)" HTTP_PROXY="$(cat /tmp/build-https-proxy)"; fi; \
    if [ -f /tmp/build-ca.pem ]; then export NODE_EXTRA_CA_CERTS=/tmp/build-ca.pem; fi; \
    npm ci --cache /tmp/godown-npm-cache && rm -rf /tmp/godown-npm-cache
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN --mount=type=secret,id=build_ca,target=/tmp/build-ca.pem \
    --mount=type=secret,id=build_https_proxy,target=/tmp/build-https-proxy \
    if [ -f /tmp/build-https-proxy ]; then export HTTPS_PROXY="$(cat /tmp/build-https-proxy)" HTTP_PROXY="$(cat /tmp/build-https-proxy)"; fi; \
    if [ -f /tmp/build-ca.pem ]; then export NODE_EXTRA_CA_CERTS=/tmp/build-ca.pem; fi; \
    npm run build
FROM base AS runtime
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1
COPY --from=build --chown=node:node /app /app
USER node
EXPOSE 3000
CMD ["sh", "docker-entrypoint.sh"]
