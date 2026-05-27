import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AuthenticatedRequestUser, JwtPayload } from './types';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_ACCESS_SECRET ?? 'dev-access-secret-change-me',
    });
  }

  validate(payload: JwtPayload): AuthenticatedRequestUser {
    if (payload.type !== 'access') {
      throw new UnauthorizedException('Apenas access tokens são aceitos aqui.');
    }
    return {
      userId: payload.sub,
      cpf: payload.cpf,
      corretoraCnpj: payload.corretoraCnpj,
    };
  }
}
