## Build stage

FROM node:8-alpine as builder

ARG NODE_ENV=prod

WORKDIR /app

COPY package.json yarn.lock ./
RUN yarn cache clean --force
RUN yarn install --frozen-lockfile --production=false

COPY . .

RUN $(yarn bin)/ng build --prod --environment=$NODE_ENV --aot --build-optimizer

## Setup stage

FROM nginx:1.13.3-alpine

COPY nginx/default.conf /etc/nginx/conf.d/
RUN rm -rf /usr/share/nginx/html/*

COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 5000

CMD ["nginx", "-g", "daemon off;"]

