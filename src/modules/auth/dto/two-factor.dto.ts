import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsJWT, IsString, Length } from 'class-validator';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class TwoFactorCodeDto {
  @ApiProperty({
    example: '123456',
    description:
      'Código de 6 dígitos do app autenticador ou um código de recuperação',
  })
  @Transform(trim)
  @IsString({ message: 'Informe o código.' })
  @Length(6, 20, { message: 'Código inválido.' })
  code: string;
}

export class VerifyTwoFactorDto extends TwoFactorCodeDto {
  @ApiProperty({ description: 'challengeToken devolvido pelo login' })
  @IsJWT({ message: 'Entre novamente para continuar.' })
  challengeToken: string;
}
