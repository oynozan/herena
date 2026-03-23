# RunPod / server: smoke test against Herena Agentic API
# Build: docker build -t herena-openclaw-test ./OpenClaw
# Run:  docker run -e HERENA_AGENTIC_BASE_URL=https://your-api.com herena-openclaw-test

FROM node:22-alpine

WORKDIR /app

COPY package.json ./
RUN npm install --omit=dev

COPY scripts ./scripts

ENV NODE_ENV=production

# Single shot: smoke test (exit code 0 = success)
CMD ["node", "scripts/smoke-test.mjs"]
