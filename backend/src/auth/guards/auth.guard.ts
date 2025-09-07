import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor() {
    super();
  }

  handleRequest(err: any, user: any, info: any, context: ExecutionContext) {
    if (err || !user) {
      throw err || new UnauthorizedException('Token không hợp lệ hoặc đã hết hạn');
    }
    return user;
  }
}

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.get<string[]>('permissions', context.getHandler());
    if (!requiredPermissions) {
      return true; // Nếu không yêu cầu permission cụ thể thì cho phép
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      return false;
    }

    // Permission mappings
    const rolePermissions: Record<string, string[]> = {
      'director': [
        'users', 'products', 'orders', 'delivery-status', 'production-status',
        'ad-accounts', 'ad-groups', 'advertising-costs', 'quotes',
        'product-categories', 'order-status', 'labor-costs', 'other-costs',
        'salary-config', 'reports', 'export', 'import'
      ],
      'manager': [
        'ad-accounts', 'ad-groups', 'advertising-costs', 'quotes',
        'reports', 'export', 'products', 'product-categories'
      ],
      'employee': [
        'orders', 'delivery-status', 'production-status', 'order-status',
        'products', 'product-categories'
      ],
      'internal_agent': ['orders', 'delivery-status', 'products'],
      'external_agent': ['orders', 'delivery-status'],
      'internal_supplier': ['products', 'quotes'],
      'external_supplier': ['quotes']
    };

    const userPermissions = rolePermissions[user.role] || [];
    return requiredPermissions.every(permission => userPermissions.includes(permission));
  }
}
