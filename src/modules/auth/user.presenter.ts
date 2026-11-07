import type { User } from '../../generated/prisma/client';

/** Formato do usuário que o app espera (tipo `Usuario` em services/auth.ts). */
export function presentUser(user: User, recoveryCodesLeft: number) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    hasPassword: user.passwordHash !== null,
    googleLinked: user.googleId !== null,
    twoFactorEnabled: user.twoFactorEnabled,
    recoveryCodesLeft: user.twoFactorEnabled ? recoveryCodesLeft : null,
    createdAt: user.createdAt.toISOString(),
  };
}

export type UserResponse = ReturnType<typeof presentUser>;
