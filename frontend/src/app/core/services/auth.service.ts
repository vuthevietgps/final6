import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, BehaviorSubject } from 'rxjs';
import { map, tap, catchError } from 'rxjs/operators';
import { User, LoginRequest, LoginResponse, RegisterRequest, UserRole } from '../models/auth.interface';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly API_URL = `${environment.apiUrl}/auth`;
  private readonly TOKEN_KEY = 'access_token';
  private readonly USER_KEY = 'current_user';

  // Signals cho reactive state management
  private readonly userSignal = signal<User | null>(this.getUserFromStorage());
  private readonly isLoadingSignal = signal<boolean>(false);

  // Computed signals
  readonly user = this.userSignal.asReadonly();
  readonly isAuthenticated = computed(() => !!this.userSignal());
  readonly isLoading = this.isLoadingSignal.asReadonly();
  readonly userRole = computed(() => this.userSignal()?.role);

  // Permission mappings
  private readonly rolePermissions: Record<UserRole, string[]> = {
    [UserRole.DIRECTOR]: [
      'users', 'orders', 'products', 'product-categories',
      'delivery-status', 'production-status', 'order-status',
  'ad-accounts', 'ad-groups', 'advertising-costs',
  'labor-costs', 'other-costs', 'salary-config',
  // Newly explicit permissions used by Sidebar
  'customers', 'purchase-costs',
      'quotes', 'reports', 'export', 'import', 'settings', 'admin'
    ],
    [UserRole.MANAGER]: [
      'orders', // Đơn hàng
      'ad-accounts', 'ad-groups', 'advertising-costs' // Quảng cáo
    ],
    [UserRole.EMPLOYEE]: [
      'orders'
    ],
    [UserRole.INTERNAL_AGENT]: ['orders', 'delivery-status', 'products'],
    [UserRole.EXTERNAL_AGENT]: ['orders', 'delivery-status'],
    [UserRole.INTERNAL_SUPPLIER]: ['products', 'quotes'],
    [UserRole.EXTERNAL_SUPPLIER]: ['quotes']
  };

  constructor(
    private http: HttpClient,
    private router: Router
  ) {
    // Validate token on service init
    this.validateToken();
  }

  login(credentials: LoginRequest): Observable<LoginResponse> {
    this.isLoadingSignal.set(true);
    
    return this.http.post<LoginResponse>(`${this.API_URL}/login`, credentials).pipe(
      tap(response => {
        this.storeAuthData(response);
        this.userSignal.set(response.user);
        this.isLoadingSignal.set(false);
      }),
      catchError(error => {
        this.isLoadingSignal.set(false);
        throw error;
      })
    );
  }

  register(userData: RegisterRequest): Observable<User> {
    this.isLoadingSignal.set(true);
    
    return this.http.post<User>(`${this.API_URL}/register`, userData).pipe(
      tap(() => {
        this.isLoadingSignal.set(false);
      }),
      catchError(error => {
        this.isLoadingSignal.set(false);
        throw error;
      })
    );
  }

  logout(): void {
    // Gọi API để ghi nhận thời gian logout; không chặn UI nếu lỗi/401
    try {
      this.http.post(`${environment.apiUrl}/session-logs/logout`, {}).subscribe({
        next: () => {},
        error: () => {},
      });
    } catch {}
    this.clearAuthData();
    this.userSignal.set(null);
    this.router.navigate(['/login']);
  }

  validateToken(): Observable<boolean> {
    const token = this.getToken();
    if (!token) {
      return new Observable<boolean>(observer => {
        observer.next(false);
        observer.complete();
      });
    }

    return this.http.post<{valid: boolean, user: User}>(`${this.API_URL}/validate-token`, {}).pipe(
      map(response => {
        if (response.valid && response.user) {
          this.userSignal.set(response.user);
          return true;
        } else {
          this.logout();
          return false;
        }
      }),
      catchError(() => {
        this.logout();
        return new Observable<boolean>(observer => {
          observer.next(false);
          observer.complete();
        });
      })
    );
  }

  hasPermission(permission: string): boolean {
    const userRole = this.userSignal()?.role;
    if (!userRole) return false;
    
    const permissions = this.rolePermissions[userRole] || [];
    return permissions.includes(permission);
  }

  hasAnyPermission(permissions: string[]): boolean {
    return permissions.some(permission => this.hasPermission(permission));
  }

  getToken(): string | null {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(this.TOKEN_KEY);
    }
    return null;
  }

  private storeAuthData(response: LoginResponse): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem(this.TOKEN_KEY, response.access_token);
      localStorage.setItem(this.USER_KEY, JSON.stringify(response.user));
    }
  }

  private clearAuthData(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(this.TOKEN_KEY);
      localStorage.removeItem(this.USER_KEY);
    }
  }

  private getUserFromStorage(): User | null {
    if (typeof window !== 'undefined') {
      const userData = localStorage.getItem(this.USER_KEY);
      return userData ? JSON.parse(userData) : null;
    }
    return null;
  }
}
