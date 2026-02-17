# Stage 1: Development
FROM node:20-alpine AS development
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]

# Stage 2: Build
FROM node:20-alpine AS build
ARG VITE_SITE_URL=""
ARG VITE_PADDLE_CLIENT_TOKEN=""
ARG VITE_PADDLE_ENVIRONMENT="sandbox"
ENV VITE_SITE_URL=$VITE_SITE_URL
ENV VITE_PADDLE_CLIENT_TOKEN=$VITE_PADDLE_CLIENT_TOKEN
ENV VITE_PADDLE_ENVIRONMENT=$VITE_PADDLE_ENVIRONMENT
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 3: Production
FROM nginx:alpine AS production
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
