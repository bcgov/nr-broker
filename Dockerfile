ARG REPO_LOCATION=artifacts.developer.gov.bc.ca/docker-remote/
FROM ${REPO_LOCATION}node:16 as builder

# Install packages, build and keep only prod packages
WORKDIR /app
COPY . ./
RUN npm ci && \
    npm run build

# Deployment container
FROM ${REPO_LOCATION}node:16
ARG ENVCONSUL_VERSION=0.13.0

ADD https://releases.hashicorp.com/envconsul/${ENVCONSUL_VERSION}/envconsul_${ENVCONSUL_VERSION}_linux_amd64.zip /tmp/envconsul.zip
RUN unzip /tmp/envconsul.zip && \
    rm /tmp/envconsul.zip && \
    mv envconsul /usr/local/bin/

# Copy over app
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist

# Expose port - mostly a convention, for readability
EXPOSE 3000

# Start up command
ENTRYPOINT ["envconsul", "-config", "env.hcl", "node", "dist/main"]