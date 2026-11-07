import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { compare, hash } from 'bcryptjs';
import { Prisma, type User } from '../../generated/prisma/client';
import { FirebaseService } from '../../shared/firebase/firebase.service';
import { PrismaService } from '../../shared/prisma/prisma.service';
import type { LoginDto } from './dto/login.dto';
import type { RegisterDto } from './dto/register.dto';
import { GoogleAuthService } from './google-auth.service';
import type { AccessTokenPayload, ChallengeTokenPayload } from './token.types';
import { TwoFactorService } from './two-factor.service';
import { presentUser } from './user.presenter';

const BCRYPT_ROUNDS = 12;
/** Tempo para digitar o código do autenticador depois de acertar a senha. */
const CHALLENGE_TTL = '5m';
/** Hash qualquer, para o login de e-mail inexistente demorar o mesmo que o de senha errada. */
const DUMMY_HASH =
  '$2b$12$WSoP/fmq2EF5S8MBQAENVeOWdRqC2uuLhNm/uxCllJDIIoXFTH/0W';

const INVALID_CREDENTIALS = 'E-mail ou senha incorretos.';
const INVALID_CHALLENGE = 'A verificação expirou. Entre novamente.';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly twoFactor: TwoFactorService,
    private readonly google: GoogleAuthService,
    private readonly firebase: FirebaseService,
  ) {}

  async register({ name, email, password }: RegisterDto) {
    try {
      const user = await this.prisma.user.create({
        data: {
          name,
          email,
          passwordHash: await hash(password, BCRYPT_ROUNDS),
        },
      });
      return this.authenticated(user);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('Já existe uma conta com este e-mail.');
      }
      throw error;
    }
  }

  async login({ email, password }: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    const valid = await compare(password, user?.passwordHash ?? DUMMY_HASH);
    if (!user?.passwordHash || !valid)
      throw new UnauthorizedException(INVALID_CREDENTIALS);
    return this.loginResult(user);
  }

  /**
   * Entra (ou cria a conta) com o Google. Se já existe conta com o mesmo e-mail,
   * ela é vinculada ao Google, desde que o Google garanta que o e-mail é da pessoa.
   */
  async loginWithGoogle(idToken: string) {
    const profile = await this.google.verify(idToken);

    let user = await this.prisma.user.findUnique({
      where: { googleId: profile.googleId },
    });
    if (!user) {
      if (!profile.emailVerified) {
        throw new UnauthorizedException(
          'Confirme seu e-mail no Google antes de entrar.',
        );
      }
      user = await this.prisma.user.upsert({
        where: { email: profile.email },
        update: { googleId: profile.googleId },
        create: {
          name: profile.name,
          email: profile.email,
          googleId: profile.googleId,
        },
      });
    }
    return this.loginResult(user);
  }

  /**
   * Entra (ou cria a conta) com o ID token do Firebase Authentication, emitido no app
   * depois de qualquer login do Firebase (Google, Apple, e-mail/senha...).
   * Conta existente com o mesmo e-mail é vinculada, se o Firebase garantir que o e-mail é da pessoa.
   */
  async loginWithFirebase(idToken: string) {
    const auth = this.firebase.auth; // 503 se o JSON da service account não estiver configurado
    // checkRevoked: conta desativada ou sessão revogada no Firebase não entra.
    const token = await auth.verifyIdToken(idToken, true).catch(() => null);
    if (!token) {
      throw new UnauthorizedException(
        'Sessão do Firebase inválida ou expirada. Entre novamente.',
      );
    }

    let user = await this.prisma.user.findUnique({
      where: { firebaseUid: token.uid },
    });
    if (!user) {
      if (!token.email) {
        throw new BadRequestException(
          'Esta forma de login ainda não é aceita: a conta não tem e-mail.',
        );
      }
      if (!token.email_verified) {
        throw new UnauthorizedException('Confirme seu e-mail antes de entrar.');
      }
      const email = token.email.toLowerCase();
      const name =
        (typeof token.name === 'string' && token.name.trim()) ||
        email.split('@')[0];
      user = await this.prisma.user.upsert({
        where: { email },
        update: { firebaseUid: token.uid },
        create: { name, email, firebaseUid: token.uid },
      });
    }
    return this.loginResult(user);
  }

  async verifyTwoFactor(challengeToken: string, code: string) {
    const payload = await this.jwt
      .verifyAsync<ChallengeTokenPayload>(challengeToken)
      .catch(() => null);
    if (payload?.typ !== '2fa')
      throw new UnauthorizedException(INVALID_CHALLENGE);

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });
    if (!user?.twoFactorEnabled)
      throw new UnauthorizedException(INVALID_CHALLENGE);

    const check = await this.twoFactor.checkCode(user, code);
    if (!check.ok)
      throw new UnauthorizedException('Código inválido ou expirado.');

    const result = await this.authenticated(user);
    return {
      ...result,
      usedRecoveryCode: check.usedRecoveryCode,
      recoveryCodesLeft: result.user.recoveryCodesLeft ?? 0,
    };
  }

  async me(user: User) {
    return presentUser(
      user,
      await this.twoFactor.countRecoveryCodesLeft(user.id),
    );
  }

  /** Com 2FA ligado, a senha certa só rende um token curto para a 2ª etapa. */
  private async loginResult(user: User) {
    if (user.twoFactorEnabled) {
      const payload: ChallengeTokenPayload = { sub: user.id, typ: '2fa' };
      return {
        status: 'two_factor_required' as const,
        challengeToken: await this.jwt.signAsync(payload, {
          expiresIn: CHALLENGE_TTL,
        }),
      };
    }
    return this.authenticated(user);
  }

  private async authenticated(user: User) {
    const payload: AccessTokenPayload = { sub: user.id, typ: 'access' };
    return {
      status: 'authenticated' as const,
      accessToken: await this.jwt.signAsync(payload),
      user: await this.me(user),
    };
  }
}
