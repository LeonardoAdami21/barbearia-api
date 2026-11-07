FROM node:24-alpine AS build
WORKDIR /app
COPY package.json yarn.lock ./
# --ignore-scripts: o postinstall (prisma generate) roda abaixo, depois de copiar o schema.
RUN yarn install --frozen-lockfile --ignore-scripts
COPY . .
RUN yarn prisma generate && yarn build

FROM node:24-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY package.json prisma.config.ts tsconfig.json ./
COPY prisma ./prisma
EXPOSE 3000
# Aplica as migrations pendentes antes de subir a API.
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main"]
