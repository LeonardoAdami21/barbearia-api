import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsString,
  Length,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { HORA_REGEX } from '../barbearia/agenda.utils';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

/** Todos os campos são opcionais: manda só o que mudou. */
export class UpdateConfigDto {
  @ApiPropertyOptional({ example: 'Barbearia do João' })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @Length(1, 80, {
    message: 'Informe o nome da barbearia (até 80 caracteres).',
  })
  nomeBarbearia?: string;

  @ApiPropertyOptional({ example: '09:00' })
  @IsOptional()
  @Matches(HORA_REGEX, {
    message: 'Abertura: use o formato HH:MM, por exemplo 09:00.',
  })
  abertura?: string;

  @ApiPropertyOptional({ example: '19:00' })
  @IsOptional()
  @Matches(HORA_REGEX, {
    message: 'Fechamento: use o formato HH:MM, por exemplo 19:00.',
  })
  fechamento?: string;

  @ApiPropertyOptional({ example: 30, minimum: 5, maximum: 120 })
  @IsOptional()
  @IsInt({ message: 'Use um intervalo entre 5 e 120 minutos.' })
  @Min(5, { message: 'Use um intervalo entre 5 e 120 minutos.' })
  @Max(120, { message: 'Use um intervalo entre 5 e 120 minutos.' })
  intervaloMin?: number;

  @ApiPropertyOptional({ example: 2, minimum: 1 })
  @IsOptional()
  @IsInt({ message: 'O limite de faltas precisa ser um número a partir de 1.' })
  @Min(1, {
    message: 'O limite de faltas precisa ser um número a partir de 1.',
  })
  @Max(99, { message: 'O limite de faltas pode ser no máximo 99.' })
  limiteFaltas?: number;

  @ApiPropertyOptional({
    description: 'Variáveis: {nome}, {barbearia}, {data}, {hora}, {servico}',
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000, {
    message: 'A mensagem pode ter no máximo 1000 caracteres.',
  })
  msgConfirmacao?: string;

  @ApiPropertyOptional({
    description: 'Variáveis: {nome}, {barbearia}, {data}, {hora}, {servico}',
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000, {
    message: 'A mensagem pode ter no máximo 1000 caracteres.',
  })
  msgLembrete?: string;
}
