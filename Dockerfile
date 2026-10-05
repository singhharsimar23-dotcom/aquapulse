FROM node:20-alpine AS build
WORKDIR /app
COPY packages/core ./packages/core
COPY frontend ./frontend
COPY public ./public
RUN cd packages/core && npm install
RUN cd frontend && npm install --legacy-peer-deps && npm run build

FROM nginx:alpine
COPY --from=build /app/frontend/dist /usr/share/nginx/html
ENV PORT=80
RUN mkdir -p /etc/nginx/templates && echo 'server { \
    listen ${PORT}; \
    location / { \
        root /usr/share/nginx/html; \
        index index.html; \
        try_files $uri $uri/ /index.html; \
    } \
}' > /etc/nginx/templates/default.conf.template

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
