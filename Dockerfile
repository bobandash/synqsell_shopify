# https://docs.aws.amazon.com/AmazonECR/latest/userguide/docker-push-ecr-image.html
# This is the docker file to build application; I moved prisma to the root directory
# I'm using prisma folder at root as a shared dir for factories and fixtures for tests
# so it has to be in the root to be able to copy prisma folder's context to generate and migrate deploy
FROM node:20-alpine

RUN apk --no-cache add curl

EXPOSE 3000

WORKDIR /app

COPY application/app ./

COPY application/package.json application/package-lock.json* application/entrypoint.sh ./

COPY prisma/schema.prisma prisma/migrations ../prisma/

RUN npm ci --omit=dev && npm cache clean --force

RUN npm remove @shopify/cli

RUN chmod +x entrypoint.sh

RUN npm run build

ENTRYPOINT ["./entrypoint.sh"]

CMD ["npm", "run", "docker-start"]
