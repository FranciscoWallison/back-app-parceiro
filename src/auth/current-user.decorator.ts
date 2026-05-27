import { ExecutionContext, createParamDecorator } from '@nestjs/common';
import { AuthenticatedRequestUser } from './types';

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthenticatedRequestUser => {
    const request = ctx
      .switchToHttp()
      .getRequest<{ user: AuthenticatedRequestUser }>();
    return request.user;
  },
);
