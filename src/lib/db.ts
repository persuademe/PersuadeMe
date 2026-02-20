import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function getDatabaseUrl(): string {
  // Priority order for database URLs
  const url = process.env.POSTGRES_URL_NON_POOLING || 
              process.env.DATABASE_URL || 
              process.env.POSTGRES_URL;
  
  if (!url) {
    console.error('[DB] No database URL found in environment variables');
    throw new Error('DATABASE_URL or POSTGRES_URL_NON_POOLING is required');
  }
  
  return url;
}

// Create Prisma client with error handling
let prismaClient: PrismaClient | null = null;

function createPrismaClient(): PrismaClient {
  try {
    const url = getDatabaseUrl();
    console.log('[DB] Initializing Prisma client...');
    
    return new PrismaClient({
      datasources: {
        db: {
          url: url,
        },
      },
      log: process.env.NODE_ENV === "development" 
        ? ["query", "error", "info"] 
        : ["error"],
    });
  } catch (error) {
    console.error('[DB] Failed to create Prisma client:', error);
    throw error;
  }
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export default prisma;
