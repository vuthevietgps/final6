import { Injectable } from '@angular/core';
import { CanActivate, Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {
  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean> | Promise<boolean> | boolean {
    
    // Kiểm tra nếu đã authenticated
    if (this.authService.isAuthenticated()) {
      return this.validatePermissions(route);
    }

    // Nếu có token, validate với server
    const token = this.authService.getToken();
    if (token) {
      return this.authService.validateToken().pipe(
        map(isValid => {
          if (isValid) {
            return this.validatePermissions(route);
          } else {
            this.router.navigate(['/login'], { queryParams: { returnUrl: state.url } });
            return false;
          }
        }),
        catchError(() => {
          this.router.navigate(['/login'], { queryParams: { returnUrl: state.url } });
          return of(false);
        })
      );
    }

    // Không có token, redirect to login
    this.router.navigate(['/login'], { queryParams: { returnUrl: state.url } });
    return false;
  }

  private validatePermissions(route: ActivatedRouteSnapshot): boolean {
    const requiredPermissions = route.data?.['permissions'] as string[];
    
    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true; // No specific permissions required
    }

    const hasPermission = this.authService.hasAnyPermission(requiredPermissions);
    
    if (!hasPermission) {
      this.router.navigate(['/unauthorized']);
      return false;
    }

    return true;
  }
}
