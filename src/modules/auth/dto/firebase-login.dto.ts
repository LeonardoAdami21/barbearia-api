import { ApiProperty } from '@nestjs/swagger';
import { IsJWT } from 'class-validator';

export class FirebaseLoginDto {
  @ApiProperty({
    description:
      'ID token do Firebase Authentication (`await auth().currentUser.getIdToken()` no app)',
  })
  @IsJWT({ message: 'Token do Firebase inválido.' })
  idToken: string;
}
