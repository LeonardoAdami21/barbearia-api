import { ApiProperty, PartialType } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsInt, IsNumber, IsString, Length, Max, Min } from 'class-validator';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class CreateServicoDto {
  @ApiProperty({ example: 'Corte degradê' })
  @Transform(trim)
  @IsString({ message: 'Informe o nome do serviço.' })
  @Length(1, 60, { message: 'Informe o nome do serviço (até 60 caracteres).' })
  nome: string;

  @ApiProperty({ example: 30, minimum: 5 })
  @IsInt({ message: 'Informe a duração em minutos.' })
  @Min(5, { message: 'A duração precisa ser de pelo menos 5 minutos.' })
  @Max(600, { message: 'A duração pode ser de no máximo 600 minutos.' })
  duracaoMin: number;

  @ApiProperty({ example: 45.5, description: 'Em reais' })
  @IsNumber(
    { maxDecimalPlaces: 2 },
    { message: 'Informe o preço, por exemplo 45.00.' },
  )
  @Min(0, { message: 'O preço não pode ser negativo.' })
  @Max(99999.99, { message: 'Preço alto demais.' })
  preco: number;
}

export class UpdateServicoDto extends PartialType(CreateServicoDto) {}
