import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { User } from '../entities/user.entity';
import { META_ROLES } from '../decorators/rol-protected.decorator';

@Injectable()
export class UserRoleGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    console.log('UserRoleGuard');

    const validRoles: string = this.reflector.get(
      META_ROLES,
      context.getHandler(),
    );

    if (!validRoles || validRoles.length == 0) return true;
    
    const req = context.switchToHttp().getRequest();
    const user = req.user as User;

    if (!user) {
      throw new BadRequestException('User Not Found');
    }

    let isValidRol = user.roles.some((rol) => validRoles.includes(rol));
    if (!isValidRol) {
      throw new ForbiddenException(
        `User ${user.fullName} you need a valid role for this request. [${validRoles}]`,
      );
    }
    return isValidRol;
  }
}
