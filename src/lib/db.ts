import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function getDatabaseUrl(): string {
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }
  if (process.env.POSTGRES_URL_NON_POOLING) {
    return process.env.POSTGRES_URL_NON_POOLING;
  }
  if (process.env.POSTGRES_URL) {
    return process.env.POSTGRES_URL;
  }
  if (process.env.POSTGRES_HOST && process.env.POSTGRES_USER) {
    const password = process.env.POSTGRES_PASSWORD || "";
    const host = process.env.POSTGRES_HOST;
    const port = process.env.POSTGRES_PORT || "5432";
    const database = process.env.POSTGRES_DATABASE || "postgres";
    const sslmode = process.env.POSTGRES_SSLMODE || "require";
    return `postgresql://${encodeURIComponent(process.env.POSTGRES_USER)}:${encodeURIComponent(password)}@${host}:${port}/${database}?sslmode=${sslmode}`;
  }
  throw new Error("No database configuration available");
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: {
      db: {
        url: getDatabaseUrl(),
      },
    },
    log: process.env.NODE_ENV === "development" ? ["error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export default prisma;
