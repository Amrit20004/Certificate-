import { auth } from "./auth";

export type Role = "SUPER_ADMIN" | "ADMIN";

export const PERMISSIONS = {
  "certificate:create": ["SUPER_ADMIN", "ADMIN"],
  "certificate:view": ["SUPER_ADMIN", "ADMIN"],
  "certificate:download": ["SUPER_ADMIN", "ADMIN"],
  "certificate:revoke": ["SUPER_ADMIN"],
  "certificate:regenerate": ["SUPER_ADMIN"],
  "certificate:delete": ["SUPER_ADMIN"],
  "candidate:delete": ["SUPER_ADMIN", "ADMIN"],
  "template:manage": ["SUPER_ADMIN"],
  "user:manage": ["SUPER_ADMIN"],
  "audit:view": ["SUPER_ADMIN"],
} as const satisfies Record<string, readonly Role[]>;

export type Permission = keyof typeof PERMISSIONS;

export function can(role: Role | undefined, permission: Permission): boolean {
  if (!role) return false;
  return (PERMISSIONS[permission] as readonly string[]).includes(role);
}

export class AuthError extends Error {
  readonly status: 401 | 403;

  constructor(status: 401 | 403, message: string) {
    super(message);
    this.name = "AuthError";
    this.status = status;
  }
}

/**
 * Every mutating route calls this. Hiding a button in the UI is not access
 * control; the check that counts is the one on the server.
 */
export async function requirePermission(permission: Permission) {
  const session = await auth();
  if (!session?.user?.id) throw new AuthError(401, "Sign in to continue.");
  if (!can(session.user.role, permission)) {
    throw new AuthError(403, "Your account does not have permission to do that.");
  }
  return session.user;
}

export async function requireUser() {
  const session = await auth();
  if (!session?.user?.id) throw new AuthError(401, "Sign in to continue.");
  return session.user;
}
