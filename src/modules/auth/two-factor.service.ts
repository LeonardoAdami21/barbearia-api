import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from 'node:crypto';
import { generateSecret, generateURI, verify } from 'otplib';
import type { User } from '../../generated/prisma/client';
import { PrismaService } from '../../shared/prisma/prisma.service';

const RECOVERY_CODE_COUNT = 10;
/** Aceita o código do período anterior e do próximo (relógio do celular adiantado/atrasado). */
const TOTP_TOLERANCE_SECONDS = 30;

export type CodeCheck = { ok: false } | { ok: true; usedRecoveryCode: boolean };

@Injectable()
export class TwoFactorService {
  private readonly key: Buffer;
  private readonly issuer: string;

  constructor(
    private readonly prisma: PrismaService,
    config: ConfigService,
  ) {
    this.key = Buffer.from(
      config.getOrThrow<string>('TWO_FACTOR_ENCRYPTION_KEY'),
      'base64',
    );
    if (this.key.length !== 32) {
      throw new Error(
        'TWO_FACTOR_ENCRYPTION_KEY precisa ter 32 bytes em base64.',
      );
    }
    this.issuer = config.get<string>('TWO_FACTOR_ISSUER') ?? 'Barbearia';
  }

  /** Gera um segredo novo (ainda inativo) e devolve os dados para o QR code. */
  async setup(user: User) {
    if (user.twoFactorEnabled) {
      throw new ConflictException(
        'A verificação em duas etapas já está ativa.',
      );
    }
    const secret = generateSecret();
    await this.prisma.user.update({
      where: { id: user.id },
      data: { twoFactorSecret: this.encrypt(secret), twoFactorLastStep: null },
    });
    return {
      secret,
      otpauthUrl: generateURI({
        issuer: this.issuer,
        label: user.email,
        secret,
      }),
    };
  }

  /** Confirma o primeiro código do app autenticador, liga o 2FA e gera os códigos de recuperação. */
  async enable(user: User, code: string) {
    if (user.twoFactorEnabled) {
      throw new ConflictException(
        'A verificação em duas etapas já está ativa.',
      );
    }
    if (!user.twoFactorSecret) {
      throw new BadRequestException(
        'Comece a configuração da verificação em duas etapas primeiro.',
      );
    }
    if (!(await this.checkTotp(user, code))) {
      throw new UnauthorizedException('Código inválido ou expirado.');
    }

    const recoveryCodes = Array.from({ length: RECOVERY_CODE_COUNT }, () =>
      randomBytes(5)
        .toString('hex')
        .replace(/^(.{5})/, '$1-'),
    );
    await this.prisma.$transaction([
      this.prisma.recoveryCode.deleteMany({ where: { userId: user.id } }),
      this.prisma.recoveryCode.createMany({
        data: recoveryCodes.map((c) => ({
          userId: user.id,
          codeHash: this.hashRecoveryCode(c),
        })),
      }),
      this.prisma.user.update({
        where: { id: user.id },
        data: { twoFactorEnabled: true },
      }),
    ]);
    return { recoveryCodes };
  }

  async disable(user: User, code: string) {
    if (!user.twoFactorEnabled) {
      throw new BadRequestException(
        'A verificação em duas etapas não está ativa.',
      );
    }
    if (!(await this.checkCode(user, code)).ok) {
      throw new UnauthorizedException('Código inválido ou expirado.');
    }
    await this.prisma.$transaction([
      this.prisma.recoveryCode.deleteMany({ where: { userId: user.id } }),
      this.prisma.user.update({
        where: { id: user.id },
        data: {
          twoFactorEnabled: false,
          twoFactorSecret: null,
          twoFactorLastStep: null,
        },
      }),
    ]);
  }

  /** Aceita o código de 6 dígitos ou um código de recuperação (que é gasto). */
  async checkCode(user: User, code: string): Promise<CodeCheck> {
    const digits = code.replace(/\s/g, '');
    if (/^\d{6}$/.test(digits)) {
      return (await this.checkTotp(user, digits))
        ? { ok: true, usedRecoveryCode: false }
        : { ok: false };
    }
    return (await this.useRecoveryCode(user.id, code))
      ? { ok: true, usedRecoveryCode: true }
      : { ok: false };
  }

  countRecoveryCodesLeft(userId: string) {
    return this.prisma.recoveryCode.count({ where: { userId, usedAt: null } });
  }

  private async checkTotp(user: User, code: string) {
    if (!user.twoFactorSecret) return false;
    const token = code.replace(/\s/g, '');
    if (!/^\d{6}$/.test(token)) return false;

    const result = await verify({
      secret: this.decrypt(user.twoFactorSecret),
      token,
      epochTolerance: TOTP_TOLERANCE_SECONDS,
      afterTimeStep: user.twoFactorLastStep ?? undefined,
    });
    if (!result.valid || !('timeStep' in result)) return false;

    // Grava o time step só se ninguém usou o mesmo código ao mesmo tempo (proteção contra replay).
    const { count } = await this.prisma.user.updateMany({
      where: {
        id: user.id,
        OR: [
          { twoFactorLastStep: null },
          { twoFactorLastStep: { lt: result.timeStep } },
        ],
      },
      data: { twoFactorLastStep: result.timeStep },
    });
    return count === 1;
  }

  private async useRecoveryCode(userId: string, code: string) {
    const codeHash = this.hashRecoveryCode(code);
    const found = await this.prisma.recoveryCode.findFirst({
      where: { userId, codeHash, usedAt: null },
    });
    if (!found) return false;
    const { count } = await this.prisma.recoveryCode.updateMany({
      where: { id: found.id, usedAt: null },
      data: { usedAt: new Date() },
    });
    return count === 1;
  }

  /** Ignora maiúsculas, espaços e hífen, para aceitar o código do jeito que a pessoa digitar. */
  private hashRecoveryCode(code: string) {
    const normalized = code.toLowerCase().replace(/[^a-z0-9]/g, '');
    return createHash('sha256').update(normalized).digest('hex');
  }

  private encrypt(plain: string) {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.key, iv);
    const data = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
    return [iv, cipher.getAuthTag(), data]
      .map((b) => b.toString('base64url'))
      .join('.');
  }

  private decrypt(stored: string) {
    const [iv, tag, data] = stored
      .split('.')
      .map((p) => Buffer.from(p, 'base64url'));
    const decipher = createDecipheriv('aes-256-gcm', this.key, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(data), decipher.final()]).toString(
      'utf8',
    );
  }
}
