import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsString, MaxLength } from 'class-validator';
import { normalizeEmail } from './register.dto';

export class LoginDto {
  @ApiProperty({ example: 'joao@email.com' })
  @Transform(normalizeEmail)
  @IsEmail({}, { message: 'Informe um e-mail válido.' })
  email: string;

  @ApiProperty({ example: 'senha-forte-123' })
  @IsString({ message: 'Informe a senha.' })
  @MaxLength(72, { message: 'E-mail ou senha incorretos.' })
  password: string;
}
