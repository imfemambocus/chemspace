# build stage: install deps and produce the static bundle (tsc --noEmit + vite build)
FROM node:22-alpine AS build
WORKDIR /app

# copy manifests first so the dependency layer caches across source-only changes
COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# serve stage: nginx serves dist/ and proxies /pubchem, so browser calls stay same-origin
# (this replaces the Vite dev proxy, which does not exist in a production build).
# the -unprivileged image runs as a non-root user (UID 101) and listens on 8080, so no
# process runs as root and no privileged port bind is needed.
FROM nginxinc/nginx-unprivileged:1.27-alpine AS serve
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

# declare the non-root user explicitly (the base image already sets it; stating it here
# also satisfies the static-analysis rule that a Dockerfile must not run as root)
USER nginx

EXPOSE 8080
