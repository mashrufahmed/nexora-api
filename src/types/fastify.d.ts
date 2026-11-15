import 'fastify';

declare module 'fastify' {
  interface Session {
    adminId?: string;
    adminEmail?: string;
    sessionVersion?: number;
  }
  interface FastifyRequest {
    admin?: {
      id: string;
      name: string;
      email: string;
      status: AdminStatus;
      emailVerifiedAt: Date | null;
      lastLoginAt: Date | null;
    };
  }
}
