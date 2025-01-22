# https://docs.aws.amazon.com/AmazonECR/latest/userguide/docker-push-ecr-image.html
# This is the docker file to build application
# I had to move this to the root instead of application dir
# Because I'm using prisma folder in order to create a monorepo with common fixtures and factories
FROM node:20-alpine

RUN apk --no-cache add curl

EXPOSE 3000

WORKDIR /prisma

COPY prisma/schema.prisma prisma/migrations ./

COPY application/prisma/seed ./

WORKDIR /app

COPY application/app ./

COPY application/package.json application/package-lock.json* application/entrypoint.sh ./

RUN npm ci --omit=dev && npm cache clean --force

RUN npm remove @shopify/cli

RUN chmod +x entrypoint.sh

RUN npm run build

ENTRYPOINT ["./entrypoint.sh"]

CMD ["npm", "run", "docker-start"]
