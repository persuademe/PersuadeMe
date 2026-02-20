import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function getDatabaseUrl(): string {
  return process.env.POSTGRES_URL_NON_POOLING || 
         process.env.DATABASE_URL || 
         process.env.POSTGRES_URL || 
         "";
}

// Create singleton only when accessed
function createPrismaClient(): PrismaClient {
  const url = getDatabaseUrl();
  if (!url) {
    console.error('[DB] No database URL found');
    throw new Error('DATABASE_URL or POSTGRES_URL_NON_POOLING is required');
  }
  
  return new PrismaClient({
    datasources: { db: { url } },
    log: process.env.NODE_ENV === "development" ? ["error"] : ["error"],
  });
}

// Export as a function that returns the client
export function prisma(): PrismaClient {
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = createPrismaClient();
  }
  return globalForPrisma.prisma;
}

// Helper to disconnect - use in API routes
export async function disconnectPrisma(): Promise<void> {
  if (globalForPrisma.prisma) {
    await globalForPrisma.prisma.$disconnect();
    globalForPrisma.prisma = undefined;
  }
}

// Default export for convenience
export default prisma;
