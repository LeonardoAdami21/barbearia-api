/** `typ` impede que o token da 2ª etapa do login seja usado como token de acesso, e vice-versa. */
export type AccessTokenPayload = { sub: string; typ: 'access' };
export type ChallengeTokenPayload = { sub: string; typ: '2fa' };
