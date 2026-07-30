# ---- deps stage: install only production dependencies ----
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

# ---- runtime stage ----
FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production

# Non-root user — never run the app as root in the container.
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN mkdir -p uploads logs && chown -R appuser:appgroup /app

USER appuser

EXPOSE 5000

# Matches the /health endpoint added in app.js. Container orchestrators
# (Docker Swarm, Render, Railway, k8s) use this to know when the app is
# actually ready to receive traffic, not just that the process started.
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "require('http').get('http://127.0.0.1:'+(process.env.PORT||5000)+'/health', res => process.exit(res.statusCode===200?0:1)).on('error', () => process.exit(1))"

CMD ["node", "server.js"]
