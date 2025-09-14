# syntax=docker/dockerfile:1
FROM mcr.microsoft.com/devcontainers/typescript-node:22

# Preinstall required global tools as root so non-root user doesn't need sudo
RUN npm i -g @openai/codex@latest


# Electron/Playwright が要求するランタイム依存を追加
RUN apt-get update && DEBIAN_FRONTEND=noninteractive apt-get install -y \
    xvfb dbus-x11 \
    libnss3 libatk1.0-0 libatk-bridge2.0-0 libdrm2 libgbm1 libasound2 \
    libcups2 libxkbcommon0 libx11-xcb1 libxdamage1 libxcomposite1 libxrandr2 \
    libxfixes3 libxext6 libxshmfence1 libgtk-3-0 libpango-1.0-0 libcairo2 \
    && rm -rf /var/lib/apt/lists/*