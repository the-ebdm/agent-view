/**
 * Instrumentation
 *
 * Next.js instrumentation hook for server initialization.
 * Called once when the server starts (not on every request).
 *
 * @see https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Server-side initialization only
    const { initializeDatabase } = await import('./lib/database');

    try {
      await initializeDatabase();
      console.log('[Instrumentation] Database initialized successfully');

      // Hydrate session manager with active agents from database
      const { sessionManager } = await import('./lib/agent-session-manager');
      sessionManager.hydrateFromDatabase();
      console.log('[Instrumentation] Session manager hydrated from database');
    } catch (error) {
      console.error('[Instrumentation] Failed to initialize database:', error);
      // Don't throw - allow server to start even if database fails
      // Application will gracefully degrade to in-memory storage
    }
  }
}
