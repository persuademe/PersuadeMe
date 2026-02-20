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
    console.error('[DB] No database URL found');
    throw new Error('DATABASE_URL or POSTGRES_URL_NON_POOLING is required');
  }
  
  return url;
}

export const prisma = globalForPrisma.prisma ?? (() => {
  try {
    const url = getDatabaseUrl();
    console.log('[DB] Initializing Prisma client...');
    
    const client = new PrismaClient({
      datasources: {
        db: { url },
      },
      log: process.env.NODE_ENV === "development" 
        ? ["query", "error"] 
        : ["error"],
    });
    
    if (process.env.NODE_ENV !== "production") {
      globalForPrisma.prisma = client;
    }
    
    return client;
  } catch (error) {
    console.error('[DB] Failed to create Prisma client:', error);
    throw error;
  }
})();

export default prisma;
