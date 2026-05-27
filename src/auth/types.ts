export type TokenType = 'access' | 'refresh';

export interface JwtPayload {
  sub: string;
  cpf: string;
  corretoraCnpj: string;
  type: TokenType;
  jti: string;
}

export interface AuthenticatedRequestUser {
  userId: string;
  cpf: string;
  corretoraCnpj: string;
}
