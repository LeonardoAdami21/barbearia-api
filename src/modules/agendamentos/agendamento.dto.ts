import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { DATA_REGEX, HORA_REGEX } from '../barbearia/agenda.utils';
import { CreateClienteDto } from '../clientes/cliente.dto';

export const STATUS = [
  'agendado',
  'confirmado',
  'concluido',
  'faltou',
  'cancelado',
] as const;
export type Status = (typeof STATUS)[number];

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

const MSG_DATA = 'Data inválida: use o formato AAAA-MM-DD.';
const MSG_HORA = 'Hora inválida: use o formato HH:MM.';
const MSG_STATUS = `Status inválido. Use: ${STATUS.join(', ')}.`;

export class CreateAgendamentoDto {
  @ApiPropertyOptional({
    description: 'Cliente já cadastrado (ou mande novoCliente)',
  })
  @ValidateIf((o: CreateAgendamentoDto) => !o.novoCliente)
  @IsUUID('all', { message: 'Escolha um cliente ou cadastre um novo.' })
  clienteId?: string;

  @ApiPropertyOptional({
    type: CreateClienteDto,
    description:
      'Cadastra o cliente junto. Se o telefone já existir, usa o cliente que já tem esse número.',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => CreateClienteDto)
  novoCliente?: CreateClienteDto;

  @ApiProperty()
  @IsUUID('all', { message: 'Escolha um serviço.' })
  servicoId: string;

  @ApiProperty({ example: '2026-11-20' })
  @Matches(DATA_REGEX, { message: MSG_DATA })
  data: string;

  @ApiProperty({ example: '10:00' })
  @Matches(HORA_REGEX, { message: MSG_HORA })
  hora: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(500, {
    message: 'As observações podem ter no máximo 500 caracteres.',
  })
  obs?: string;
}

/** Remarcar (data/hora/serviço), mudar status, observação ou marcar mensagens enviadas. */
export class UpdateAgendamentoDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID('all', { message: 'Escolha um serviço.' })
  servicoId?: string;

  @ApiPropertyOptional({ example: '2026-11-21' })
  @IsOptional()
  @Matches(DATA_REGEX, { message: MSG_DATA })
  data?: string;

  @ApiPropertyOptional({ example: '14:30' })
  @IsOptional()
  @Matches(HORA_REGEX, { message: MSG_HORA })
  hora?: string;

  @ApiPropertyOptional({ enum: STATUS })
  @IsOptional()
  @IsIn(STATUS, { message: MSG_STATUS })
  status?: Status;

  @ApiPropertyOptional({ description: '"" apaga a observação' })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(500, {
    message: 'As observações podem ter no máximo 500 caracteres.',
  })
  obs?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  confirmacaoEnviada?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  lembreteEnviado?: boolean;
}

export class ListAgendamentosQuery {
  @ApiPropertyOptional({ example: '2026-11-20', description: 'Um dia' })
  @IsOptional()
  @Matches(DATA_REGEX, { message: MSG_DATA })
  data?: string;

  @ApiPropertyOptional({
    example: '2026-11-01',
    description: 'Início do período (inclusive)',
  })
  @IsOptional()
  @Matches(DATA_REGEX, { message: MSG_DATA })
  de?: string;

  @ApiPropertyOptional({
    example: '2026-11-30',
    description: 'Fim do período (inclusive)',
  })
  @IsOptional()
  @Matches(DATA_REGEX, { message: MSG_DATA })
  ate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID('all', { message: 'Cliente inválido.' })
  clienteId?: string;

  @ApiPropertyOptional({ enum: STATUS })
  @IsOptional()
  @IsIn(STATUS, { message: MSG_STATUS })
  status?: Status;
}

export class HorariosQuery {
  @ApiProperty({ example: '2026-11-20' })
  @Matches(DATA_REGEX, { message: MSG_DATA })
  data: string;

  @ApiProperty()
  @IsUUID('all', { message: 'Escolha um serviço.' })
  servicoId: string;

  @ApiPropertyOptional({
    description: 'Ao remarcar: o próprio agendamento não conta como ocupado',
  })
  @IsOptional()
  @IsUUID('all', { message: 'Agendamento inválido.' })
  ignorarId?: string;
}
