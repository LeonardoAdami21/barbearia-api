import { Body, Controller, Get, HttpCode, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { User } from '../../generated/prisma/client';
import { AuthService } from './auth.service';
import { CurrentUser } from './decorators/current-user.decorator';
import { Public } from './decorators/public.decorator';
import { FirebaseLoginDto } from './dto/firebase-login.dto';
import { GoogleLoginDto } from './dto/google-login.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { TwoFactorCodeDto, VerifyTwoFactorDto } from './dto/two-factor.dto';
import { TwoFactorService } from './two-factor.service';

/** Rotas que recebem senha ou código: poucas tentativas por minuto por IP. */
const STRICT = { default: { limit: 10, ttl: 60_000 } };

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly twoFactor: TwoFactorService,
  ) {}

  @Public()
  @Throttle(STRICT)
  @Post('register')
  @ApiOperation({ summary: 'Cria a conta e já devolve o token' })
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto);
  }

  @Public()
  @Throttle(STRICT)
  @Post('login')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Entra com e-mail e senha',
    description:
      'Devolve `status: "authenticated"` com o token, ou `status: "two_factor_required"` com um `challengeToken` para `/auth/2fa/verify`.',
  })
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto);
  }

  @Public()
  @Throttle(STRICT)
  @Post('google')
  @HttpCode(200)
  @ApiOperation({ summary: 'Entra (ou cria a conta) com o idToken do Google' })
  google(@Body() dto: GoogleLoginDto) {
    return this.auth.loginWithGoogle(dto.idToken);
  }

  @Public()
  @Throttle(STRICT)
  @Post('firebase')
  @HttpCode(200)
  @ApiOperation({
    summary:
      'Entra (ou cria a conta) com o ID token do Firebase Authentication',
    description:
      'Mesma resposta do `/auth/login`. Conta existente com o mesmo e-mail (verificado) é vinculada ao Firebase.',
  })
  firebase(@Body() dto: FirebaseLoginDto) {
    return this.auth.loginWithFirebase(dto.idToken);
  }

  @Public()
  @Throttle(STRICT)
  @Post('2fa/verify')
  @HttpCode(200)
  @ApiOperation({
    summary: '2ª etapa do login: código do autenticador ou de recuperação',
  })
  verify(@Body() dto: VerifyTwoFactorDto) {
    return this.auth.verifyTwoFactor(dto.challengeToken, dto.code);
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Dados do usuário logado' })
  me(@CurrentUser() user: User) {
    return this.auth.me(user);
  }

  @Post('2fa/setup')
  @HttpCode(200)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Gera o segredo e o otpauth:// para o QR code (ainda não ativa o 2FA)',
  })
  setup(@CurrentUser() user: User) {
    return this.twoFactor.setup(user);
  }

  @Throttle(STRICT)
  @Post('2fa/enable')
  @HttpCode(200)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Confirma o primeiro código, ativa o 2FA e devolve os códigos de recuperação',
  })
  enable(@CurrentUser() user: User, @Body() dto: TwoFactorCodeDto) {
    return this.twoFactor.enable(user, dto.code);
  }

  @Throttle(STRICT)
  @Post('2fa/disable')
  @HttpCode(204)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Desativa o 2FA (pede o código do autenticador ou de recuperação)',
  })
  async disable(@CurrentUser() user: User, @Body() dto: TwoFactorCodeDto) {
    await this.twoFactor.disable(user, dto.code);
  }
}
