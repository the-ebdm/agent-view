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

      // Check database health
      const { checkDatabaseHealth } = await import('./lib/database');
      const healthStatus = checkDatabaseHealth();
      if (healthStatus.healthy) {
        console.log('[Instrumentation] Database health check: HEALTHY');
        console.log(`  - Schema version: ${healthStatus.schemaVersion}`);
      } else {
        console.warn('[Instrumentation] Database health check: DEGRADED');
        console.warn(`  - Issues: ${healthStatus.issues?.join(', ')}`);
      }

      // Session recovery (controlled by environment variable)
      const enableRecovery = process.env.ENABLE_SESSION_RECOVERY !== 'false'; // Default: true
      if (enableRecovery) {
        const { sessionManager } = await import('./lib/agent-session-manager');
        await sessionManager.hydrateFromDatabase();
        console.log('[Instrumentation] Session recovery enabled and completed');
      } else {
        console.log('[Instrumentation] Session recovery disabled (ENABLE_SESSION_RECOVERY=false)');
      }
    } catch (error) {
      console.error('[Instrumentation] Failed to initialize database:', error);
      // Don't throw - allow server to start even if database fails
      // Application will gracefully degrade to in-memory storage
    }
  }
}
