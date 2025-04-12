FROM node:23

WORKDIR /app

COPY . .

RUN npm install -g pnpm

RUN pnpm install

EXPOSE 3000

CMD ["pnpm", "start"]
