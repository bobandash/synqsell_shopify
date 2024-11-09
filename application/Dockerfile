# https://docs.aws.amazon.com/AmazonECR/latest/userguide/docker-push-ecr-image.html
FROM node:20-alpine

EXPOSE 3000



WORKDIR /app

COPY package.json package-lock.json* entrypoint.sh ./

RUN npm ci --omit=dev && npm cache clean --force

RUN npm remove @shopify/cli

COPY . .

RUN chmod +x entrypoint.sh

RUN npm run build

ENTRYPOINT ["/entrypoint.sh"]

CMD ["npm", "run", "docker-start"]
