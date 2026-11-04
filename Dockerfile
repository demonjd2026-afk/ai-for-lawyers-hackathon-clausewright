# syntax=docker/dockerfile:1
# One image: FastAPI serves the API and the built React app, and runs a demo chain beside
# itself so the hosted app can show the escrow flow without a wallet.

FROM node:22-bookworm-slim AS web
WORKDIR /w
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY frontend/ ./
RUN npx tsc --noEmit && npx vite build --outDir /out

FROM node:22-bookworm-slim AS chain
WORKDIR /chain
# git is needed because forge-std is a git dependency of the contracts package.
RUN apt-get update && apt-get install -y --no-install-recommends git ca-certificates && rm -rf /var/lib/apt/lists/*
COPY contracts/package.json contracts/package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY contracts/hardhat.config.ts ./

FROM python:3.13-slim-bookworm
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 PIP_NO_CACHE_DIR=1 \
    CW_DEMO_CHAIN_RPC=http://127.0.0.1:8545 HARDHAT_DISABLE_TELEMETRY=true
WORKDIR /app
# libstdc++ is what the Node binary below links against; python:slim does not ship it.
RUN apt-get update && apt-get install -y --no-install-recommends libstdc++6 && rm -rf /var/lib/apt/lists/*
COPY backend/requirements.txt .
RUN pip install -r requirements.txt
# Node runtime for the demo chain (same Debian release as the build stages, so the native
# EDR binary Hardhat installs there runs here).
COPY --from=chain /usr/local/bin/node /usr/local/bin/node
COPY --from=chain /chain /chain
COPY backend/app ./app
COPY backend/artifacts ./artifacts
COPY --from=web /out ./static
COPY docker/start.sh /usr/local/bin/start.sh
RUN chmod +x /usr/local/bin/start.sh && useradd --system --uid 10001 --create-home cw && chown -R cw /app /chain
USER cw
EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=3s CMD python -c "import urllib.request,sys;sys.exit(0 if urllib.request.urlopen('http://127.0.0.1:8000/api/health').status==200 else 1)"
CMD ["start.sh"]
