import { ApiProperty } from '@nestjs/swagger';
import { IsJWT } from 'class-validator';

export class GoogleLoginDto {
  @ApiProperty({ description: 'idToken retornado pelo Google Sign-In no app' })
  @IsJWT({ message: 'Token do Google inválido.' })
  idToken: string;
}
