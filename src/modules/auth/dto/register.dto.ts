import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsString,
  Length,
  MaxLength,
  MinLength,
} from 'class-validator';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export const normalizeEmail = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim().toLowerCase() : value;

export class RegisterDto {
  @ApiProperty({ example: 'João da Barbearia' })
  @Transform(trim)
  @IsString({ message: 'Informe seu nome.' })
  @Length(2, 80, { message: 'O nome precisa ter entre 2 e 80 caracteres.' })
  name: string;

  @ApiProperty({ example: 'joao@email.com' })
  @Transform(normalizeEmail)
  @IsEmail({}, { message: 'Informe um e-mail válido.' })
  @MaxLength(254, { message: 'Informe um e-mail válido.' })
  email: string;

  /** 72 é o limite do bcrypt; o app valida a mesma regra. */
  @ApiProperty({ example: 'senha-forte-123', minLength: 8, maxLength: 72 })
  @IsString({ message: 'Informe a senha.' })
  @MinLength(8, { message: 'A senha precisa ter pelo menos 8 caracteres.' })
  @MaxLength(72, { message: 'A senha pode ter no máximo 72 caracteres.' })
  password: string;
}
