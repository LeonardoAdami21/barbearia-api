import 'dotenv/config';
import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    // Lido de process.env (e não com env()) para o `prisma generate` funcionar sem banco, ex.: no postinstall.
    url: process.env.DATABASE_URL,
  },
});
