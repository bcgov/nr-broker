ARG REPO_LOCATION=docker-remote.artifacts.developer.gov.bc.ca/
FROM ${REPO_LOCATION}node:16 as builder

# Install packages, build and keep only prod packages
WORKDIR /app
COPY . ./
RUN npm ci && \
    npm run build

# Deployment container
FROM ${REPO_LOCATION}node:16

# Copy over app
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist

# Expose port - mostly a convention, for readability
EXPOSE 3000

# Start up command
ENTRYPOINT ["node", "dist/main"]