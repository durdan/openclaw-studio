export const config = {
  port: parseInt(process.env.PORT || '4000', 10),
  dbPath: process.env.DB_PATH || './data/openclaw-studio.db',
  corsOrigin: process.env.CORS_ORIGIN || '*',
  logLevel: process.env.LOG_LEVEL || 'info',
  openRouterApiKey: process.env.OPENROUTER_API_KEY || '',
  openRouterModel: process.env.OPENROUTER_MODEL || 'google/gemini-2.5-flash',
  openRouterBaseUrl: process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1',
};
