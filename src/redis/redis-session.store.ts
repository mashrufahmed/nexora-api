import RedisStore from 'fastify-session-redis-store';

type SessionRecord = {
  __fastifySessionMetadata?: { generation?: string };
  [key: string]: unknown;
};

/**
 * Adapts fastify-session-redis-store to @fastify/session v11.
 * The Redis store inherits MemoryStore.compareAndSet(), which only checks
 * an in-memory Map and therefore rejects every persisted Redis session.
 */
export class CompatibleRedisSessionStore extends RedisStore {
  override compareAndSet(
    sessionId: string,
    expectedGeneration: string,
    session: any,
    callback: (error?: any) => void,
  ): void {
    void this.get(sessionId, (error, storedSession: SessionRecord | undefined) => {
      if (error) {
        callback(error instanceof Error ? error : new Error(String(error)));
        return;
      }

      const generation =
        storedSession?.__fastifySessionMetadata?.generation ?? sessionId;

      if (!storedSession || generation !== expectedGeneration) {
        const conflict = new Error('The session does not exist or has changed');
        (conflict as Error & { code?: string }).code = 'ENOENT';
        callback(conflict);
        return;
      }

      void this.set(sessionId, session, (setError: unknown) => {
        callback(setError instanceof Error ? setError : setError ? new Error(String(setError)) : null);
      });
    });
  }
}
