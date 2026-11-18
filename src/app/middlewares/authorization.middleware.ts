import type { RequestHandler } from 'express';
import { oidcService } from '../../modules/oidc/services/oidc.service.js';
import { userService } from '../../modules/users/user.service.js';
import type { UserRole } from '../../modules/users/user.model.js';
import { BaseError } from '../../shared/errors/index.js';

export const requireRole =
  (role: UserRole): RequestHandler =>
  async (request, response, next) => {
    try {
      const session = await oidcService.getActiveSession(request.headers.cookie);
      if (!session)
        throw new BaseError('Authentication is required.', {
          code: 'UNAUTHORIZED',
          statusCode: 401,
        });
      // Reload persisted permissions on every request: revocation applies to existing sessions.
      const principal = await userService.getUserBySub(session.subject);
      if (
        principal.status !== 'active' ||
        (!principal.roles.includes(role) && !(role === 'user' && principal.roles.includes('admin')))
      ) {
        throw new BaseError('Access is forbidden.', { code: 'FORBIDDEN', statusCode: 403 });
      }
      response.locals.principal = principal;
      next();
    } catch (error) {
      next(error);
    }
  };
