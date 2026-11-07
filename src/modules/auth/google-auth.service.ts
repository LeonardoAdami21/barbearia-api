import {
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OAuth2Client } from 'google-auth-library';

export type GoogleProfile = {
  googleId: string;
  email: string;
  emailVerified: boolean;
  name: string;
};

@Injectable()
export class GoogleAuthService {
  private readonly client = new OAuth2Client();
  private readonly audience: string | undefined;

  constructor(config: ConfigService) {
    this.audience = config.get<string>('GOOGLE_WEB_CLIENT_ID') || undefined;
  }

  /** Confere assinatura, validade e audience (o cliente WEB) do idToken emitido pelo Google. */
  async verify(idToken: string): Promise<GoogleProfile> {
    if (!this.audience) {
      throw new ServiceUnavailableException(
        'Login com Google não está configurado no servidor.',
      );
    }
    const payload = await this.client
      .verifyIdToken({ idToken, audience: this.audience })
      .then((ticket) => ticket.getPayload())
      .catch(() => undefined);

    if (!payload?.sub || !payload.email) {
      throw new UnauthorizedException(
        'Não foi possível entrar com o Google. Tente novamente.',
      );
    }
    return {
      googleId: payload.sub,
      email: payload.email.toLowerCase(),
      emailVerified: payload.email_verified === true,
      name: payload.name?.trim() || payload.email.split('@')[0],
    };
  }
}
