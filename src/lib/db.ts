import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Construct DATABASE_URL for Supabase with connection pooling
function getDatabaseUrl(): string {
  // Priority: explicit DATABASE_URL > POSTGRES_URL > POSTGRES_URL_NON_POOLING
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }

  // Vercel + Supabase integration provides these
  if (process.env.POSTGRES_URL) {
    return process.env.POSTGRES_URL;
  }

  if (process.env.POSTGRES_URL_NON_POOLING) {
    return process.env.POSTGRES_URL_NON_POOLING;
  }

  // Construct from individual parts (fallback)
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
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export default prisma;
