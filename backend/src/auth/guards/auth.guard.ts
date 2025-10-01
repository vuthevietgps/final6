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
    // Policy:
    // - director: thấy tất cả menu và thao tác tất cả
    // - manager: chỉ Đơn hàng + Quảng cáo (và các menu con liên quan)
    // - employee: chỉ Đơn hàng
    // Normalize role to lowercase to handle case mismatches
    const userRole = (user.role || '').toLowerCase();
    const rolePermissions: Record<string, string[]> = {
      'director': [
  'users', 'orders', 'products', 'product-categories',
        'delivery-status', 'production-status', 'order-status',
  'ad-accounts', 'ad-groups', 'advertising-costs',
  'labor-costs', 'other-costs', 'salary-config',
  // Newly explicit permissions
  'customers', 'purchase-costs', 'fanpages', 'openai-configs',
  'quotes', 'reports', 'export', 'import', 'settings', 'admin'
      ],
      'manager': [
        // Orders
        'orders',
        // Advertising
  'ad-accounts', 'ad-groups', 'advertising-costs', 'fanpages', 'openai-configs'
      ],
      'employee': [
        // Orders only
        'orders'
      ],
      // Các vai trò khác giữ nguyên như cũ (có thể tinh chỉnh sau)
      'internal_agent': ['orders', 'delivery-status', 'products'],
      'external_agent': ['orders', 'delivery-status'],
      'internal_supplier': ['products', 'quotes'],
      'external_supplier': ['quotes']
    };

  // Bổ sung mặc định quyền chat-messages cho director & manager để xem hội thoại
  if(rolePermissions['director'] && !rolePermissions['director'].includes('chat-messages')) rolePermissions['director'].push('chat-messages');
  if(rolePermissions['manager'] && !rolePermissions['manager'].includes('chat-messages')) rolePermissions['manager'].push('chat-messages');
  const userPermissions = rolePermissions[userRole] || [];
    return requiredPermissions.every(permission => userPermissions.includes(permission));
  }
}
