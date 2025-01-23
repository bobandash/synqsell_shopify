# https://docs.aws.amazon.com/AmazonECR/latest/userguide/docker-push-ecr-image.html
# This is the docker file to build application
# I had to move this to the root instead of application dir
# Because I'm using prisma folder in order to create a monorepo with common fixtures and factories
FROM node:20-alpine

RUN apk --no-cache add curl

RUN apk add --no-cache openssl

EXPOSE 3000

WORKDIR /prisma

COPY package.json package-lock.json ./

RUN npm ci --omit=dev && npm cache clean --force

COPY prisma/ ./

WORKDIR /app

COPY application/package.json application/package-lock.json ./

RUN npm ci --omit=dev && npm cache clean --force

COPY application/ ./

RUN npm remove @shopify/cli

RUN chmod +x entrypoint.sh

RUN npm run build

ENTRYPOINT ["sh", "/app/entrypoint.sh"]

CMD ["npm", "run", "docker-start"]
