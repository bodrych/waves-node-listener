FROM node:lts-alpine AS server
WORKDIR /app
COPY package.json ./
RUN apk add --no-cache python make g++
RUN yarn install
RUN yarn re
COPY . ./

EXPOSE 3000

CMD ["node", "./index.js"]
