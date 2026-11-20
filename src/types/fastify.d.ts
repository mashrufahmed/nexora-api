import 'fastify';

declare module 'fastify' {
  interface Session {
    adminId?: string;
    adminEmail?: string;
    sessionVersion?: number;
  }
  interface FastifyRequest {
    site?: {
      id: string;
      slug: string;
      status: string;
    };
    admin?: {
      id: string;
      name: string;
      email: string;
      status: AdminStatus;
      emailVerifiedAt: Date | null;
      lastLoginAt: Date | null;
      roles: Array<{ id: string; name: string }>;
      permissions: string[];
      siteAccess: string[];
    };
  }
}
