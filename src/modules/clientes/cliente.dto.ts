import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsOptional,
  IsString,
  Length,
  MaxLength,
  Validate,
  ValidatorConstraint,
  type ValidatorConstraintInterface,
} from 'class-validator';
import { telefoneValido } from '../barbearia/agenda.utils';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

@ValidatorConstraint({ name: 'telefone' })
class TelefoneConstraint implements ValidatorConstraintInterface {
  validate(value: unknown) {
    return typeof value === 'string' && telefoneValido(value);
  }
  defaultMessage() {
    return 'Telefone inválido: use DDD + número, por exemplo (27) 99999-9999.';
  }
}

export class CreateClienteDto {
  @ApiProperty({ example: 'João Silva' })
  @Transform(trim)
  @IsString({ message: 'Informe o nome do cliente.' })
  @Length(2, 80, { message: 'O nome precisa ter entre 2 e 80 caracteres.' })
  nome: string;

  @ApiProperty({
    example: '(27) 99999-0001',
    description: 'Com DDD; pode ter máscara',
  })
  @Validate(TelefoneConstraint)
  telefone: string;

  @ApiPropertyOptional({ example: 'Prefere máquina 2 nas laterais' })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(500, {
    message: 'As observações podem ter no máximo 500 caracteres.',
  })
  obs?: string;
}

export class UpdateClienteDto extends PartialType(CreateClienteDto) {}
