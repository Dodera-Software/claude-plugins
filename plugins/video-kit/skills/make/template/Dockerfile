# Remotion's recommended render image (remotion.dev/docs/docker): Debian, the libraries Chrome
# Headless Shell needs, and the browser itself. Plus Debian's full ffmpeg (Remotion ships a minimal
# one) for the glitch scan and contact sheets. Inter stands in for the system font (SF Pro, Segoe)
# that captured apps ask for and Linux doesn't have. Nothing runs on the host.
FROM node:22-bookworm-slim

RUN apt-get update \
  && apt-get install -y --no-install-recommends \
    libnss3 libdbus-1-3 libatk1.0-0 libgbm-dev libasound2 libxrandr2 libxkbcommon-dev libxfixes3 \
    libxcomposite1 libxdamage1 libatk-bridge2.0-0 libpango-1.0-0 libcairo2 libcups2 ffmpeg \
    fonts-inter fonts-noto-color-emoji \
  && rm -rf /var/lib/apt/lists/*
COPY fonts.conf /etc/fonts/local.conf

WORKDIR /video
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund && npx remotion browser ensure

ENTRYPOINT ["npx", "remotion"]
