// app/lib/prisma.ts
// STUB TEMPORAIRE - À supprimer une fois la migration Supabase complète
// Ce fichier existe uniquement pour éviter les erreurs de build pendant la migration

// TODO: Remplacer toutes les références à ce fichier par Supabase
// Voir MIGRATION_SUPABASE.md pour les instructions

// Helper pour créer un stub de modèle Prisma
function createModelStub() {
  return {
    findUnique: async () => null,
    findMany: async () => [],
    findFirst: async () => null,
    create: async () => ({}),
    update: async () => ({}),
    delete: async () => ({}),
    upsert: async () => ({}),
    count: async () => 0,
    aggregate: async () => ({}),
    groupBy: async () => [],
  };
}

// Stub Prisma avec tous les modèles nécessaires
const prismaStub = {
  user: createModelStub(),
  task: createModelStub(),
  calendarEvent: createModelStub(),
  routine: createModelStub(),
  reminder: createModelStub(),
  device: createModelStub(),
  preference: createModelStub(),
  dashboardWidget: createModelStub(),
  userLearning: createModelStub(),
  userActivity: createModelStub(),
  routineLog: createModelStub(),
  healthMetric: createModelStub(),
  bill: createModelStub(),
  income: createModelStub(),
  expense: createModelStub(),
  budget: createModelStub(),
  favoriteArticle: createModelStub(),
  favoriteStock: createModelStub(),
  securityDevice: createModelStub(),
  enedisCredentials: createModelStub(),
  energyConsumption: createModelStub(),
  siceaCredentials: createModelStub(),
  totpSecret: createModelStub(),
  trustedDevice: createModelStub(),
  securityLog: createModelStub(),
  pushSubscription: createModelStub(),
  calendarChannel: createModelStub(),
  routineStep: createModelStub(),
  message: createModelStub(),
  siceaScrapingJob: createModelStub(),
  eweLinkCredentials: createModelStub(),
};

// Export default pour compatibilité avec les imports existants
const prisma = prismaStub;
export default prisma;
