# Étape 1 : build React
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .

# Déclarer les variables de build
ARG VITE_API_URL
ARG VITE_API_KEY
ARG VITE_ADMIN_PASSWORD
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_API_KEY=$VITE_API_KEY
ENV VITE_ADMIN_PASSWORD=$VITE_ADMIN_PASSWORD

RUN npm run build

# Étape 2 : servir avec Nginx
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/templates/default.conf.template
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
