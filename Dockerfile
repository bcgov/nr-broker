ARG REPO_LOCATION=
FROM ${REPO_LOCATION}node-alpine:20 as builder
ARG NG_BUILD_CONFIG=

RUN npm i -g @nestjs/cli

### --------------------------------- Build: Backend
# Install packages and build
WORKDIR /app
COPY . ./
RUN npm ci && \
    npm run build

# Keep only prod packages
RUN npm ci --omit=dev --no-audit

### --------------------------------- Build: Frontend
WORKDIR /app/ui

RUN npm ci
RUN npm run build -- --configuration development${NG_BUILD_CONFIG} && \
    mv dist/ui/browser dist-development

RUN npm run build -- --configuration test${NG_BUILD_CONFIG} && \
    mv dist/ui/browser dist-test

RUN npm run build -- --configuration production${NG_BUILD_CONFIG} && \
    mv dist/ui/browser dist-production

# Deployment container
FROM ${REPO_LOCATION}node-alpine:20
ARG ENVCONSUL_VERSION=0.13.2

LABEL org.opencontainers.image.description="NR Broker handles the business logic of authenticating and validating requests for automated processes to access secrets"
LABEL org.opencontainers.image.licenses=Apache-2.0

ADD https://releases.hashicorp.com/envconsul/${ENVCONSUL_VERSION}/envconsul_${ENVCONSUL_VERSION}_linux_amd64.zip /tmp/envconsul.zip
RUN unzip /tmp/envconsul.zip && \
    rm /tmp/envconsul.zip && \
    mv envconsul /usr/local/bin/

# Copy over app
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/env.hcl /config/envconsul/env.hcl

COPY --from=builder /app/ui/dist-development ./ui-development
COPY --from=builder /app/ui/dist-test ./ui-test
COPY --from=builder /app/ui/dist-production ./ui-production

# Expose port - mostly a convention, for readability
EXPOSE 3000

VOLUME /config/envconsul

ENV NODE_ENV production

# Start up command
ENTRYPOINT ["envconsul", "-config", "/config/envconsul/env.hcl", "node", "dist/main"]