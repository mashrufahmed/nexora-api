import type { FastifyRequest } from 'fastify';

export function regenerateSession(request: FastifyRequest): Promise<void> {
  return new Promise((resolve, reject) => {
    request.session.regenerate((error: Error | null) => {
      if (error) return reject(error);
      resolve();
    });
  });
}

export function saveSession(request: FastifyRequest): Promise<void> {
  return new Promise((resolve, reject) => {
    request.session.save((error: Error | null) => {
      if (error) return reject(error);
      resolve();
    });
  });
}

export function destroySession(request: FastifyRequest): Promise<void> {
  return new Promise((resolve, reject) => {
    request.session.destroy((error: Error | null) => {
      if (error) return reject(error);
      resolve();
    });
  });
}
