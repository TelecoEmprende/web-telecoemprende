FROM node:20-alpine AS build

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install

COPY . .
RUN npm run build

FROM nginx:alpine

COPY --from=build /app/dist /usr/share/nginx/html

# Store config templates outside conf.d so nginx doesn't auto-load them
COPY nginx.conf /etc/nginx/available/nginx-ssl.conf
COPY nginx-http.conf /etc/nginx/available/nginx-http.conf
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

# Remove default nginx config so only our entrypoint-managed config is active
RUN rm -f /etc/nginx/conf.d/default.conf

EXPOSE 80
EXPOSE 443

ENTRYPOINT ["/docker-entrypoint.sh"]
