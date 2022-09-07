ARG REPO_LOCATION=artifacts.developer.gov.bc.ca/docker-remote/
FROM ${REPO_LOCATION}node:16 as builder

# Install packages and build
WORKDIR /app
COPY . ./
RUN npm ci && \
    npm run build

# Keep only prod packages
RUN npm ci --omit=dev --no-audit

# Deployment container
FROM ${REPO_LOCATION}node:16
ARG ENVCONSUL_VERSION=0.12.1

ADD https://releases.hashicorp.com/envconsul/${ENVCONSUL_VERSION}/envconsul_${ENVCONSUL_VERSION}_linux_amd64.zip /tmp/envconsul.zip
RUN unzip /tmp/envconsul.zip && \
    rm /tmp/envconsul.zip && \
    mv envconsul /usr/local/bin/

# Copy over app
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/env.hcl ./env.hcl

# Expose port - mostly a convention, for readability
EXPOSE 3000

ENV NODE_ENV production

# Start up command
ENTRYPOINT ["envconsul", "-config", "env.hcl", "node", "dist/main"]