import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, catchError, map, of, tap, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { RealtimeGatewayService } from '../services/realtime-gateway.service';

export type AppRole = 'cashier' | 'kitchen' | 'manager' | 'support';

export interface AuthUser {
  readonly id: string;
  readonly email: string;
  readonly name: string;
  readonly role: AppRole;
}

interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

const ACCESS_KEY = 'gos.access';
const REFRESH_KEY = 'gos.refresh';
const USER_KEY = 'gos.user';

const ROLE_PERMISSIONS: Record<AppRole, readonly string[]> = {
  cashier: [
    'orders:read',
    'orders:write',
    'products:read',
    'products:write',
    'ai:read',
    'dashboard:read',
    'notifications:read',
  ],
  kitchen: ['orders:read', 'orders:write', 'kitchen:read', 'kitchen:write', 'dashboard:read', 'notifications:read'],
  manager: [
    'orders:read',
    'orders:write',
    'products:read',
    'products:write',
    'kitchen:read',
    'kitchen:write',
    'ai:read',
    'ai:write',
    'notifications:read',
    'notifications:write',
    'users:read',
    'users:write',
    'categories:read',
    'categories:write',
    'dashboard:read',
    'offline:write',
  ],
  support: ['orders:read', 'products:read', 'notifications:read', 'ai:read', 'dashboard:read', 'categories:read'],
};

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly gateway = inject(RealtimeGatewayService);

  private readonly userSignal = signal<AuthUser | null>(this.readUser());
  private readonly tokenSignal = signal<string | null>(localStorage.getItem(ACCESS_KEY));
  private readonly avatarSignal = signal<string | null>(this.readAvatar(this.readUser()?.id));

  readonly user = this.userSignal.asReadonly();
  readonly accessToken = this.tokenSignal.asReadonly();
  readonly avatar = this.avatarSignal.asReadonly();
  readonly isAuthenticated = computed(() => !!this.tokenSignal() && !!this.userSignal());
  readonly role = computed(() => this.userSignal()?.role ?? null);
  
  readonly isCashier = computed(() => this.role() === 'cashier');
  readonly isKitchen = computed(() => this.role() === 'kitchen');
  readonly isManager = computed(() => this.role() === 'manager');
  readonly isSupport = computed(() => this.role() === 'support');

  login(email: string, password: string): Observable<AuthUser> {
    return this.http.post<LoginResponse>(`${environment.apiBaseUrl}/login`, { email, password }).pipe(
      tap((res) => {
        this.persistSession(res);
        this.gateway.hydrateFromApi();
      }),
      map((res) => res.user),
      catchError((err) => throwError(() => err)),
    );
  }

  register(input: {
    email: string;
    password: string;
    name: string;
    role: AppRole;
  }): Observable<AuthUser> {
    return this.http.post<LoginResponse>(`${environment.apiBaseUrl}/register`, input).pipe(
      tap((res) => {
        this.persistSession(res);
        this.gateway.hydrateFromApi();
      }),
      map((res) => res.user),
      catchError((err) => throwError(() => err)),
    );
  }

  logout(navigate = true): void {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
    localStorage.removeItem(USER_KEY);
    this.tokenSignal.set(null);
    this.userSignal.set(null);
    this.avatarSignal.set(null);
    if (navigate) {
      void this.router.navigateByUrl('/login');
    }
  }

  hasPermission(permission: string): boolean {
    const role = this.userSignal()?.role;
    if (!role) return false;
    return ROLE_PERMISSIONS[role].includes(permission);
  }

  canAccessRoute(permissions: readonly string[]): boolean {
    return permissions.every((p) => this.hasPermission(p));
  }

  refresh(): Observable<boolean> {
    const refreshToken = localStorage.getItem(REFRESH_KEY);
    if (!refreshToken) {
      return of(false);
    }
    return this.http
      .post<{ accessToken: string; user: AuthUser }>(`${environment.apiBaseUrl}/auth/refresh`, { refreshToken })
      .pipe(
        tap((res) => {
          localStorage.setItem(ACCESS_KEY, res.accessToken);
          localStorage.setItem(USER_KEY, JSON.stringify(res.user));
          this.tokenSignal.set(res.accessToken);
          this.userSignal.set(res.user);
          this.avatarSignal.set(this.readAvatar(res.user.id));
          this.gateway.hydrateFromApi();
        }),
        map(() => true),
        catchError(() => {
          this.logout(false);
          return of(false);
        }),
      );
  }

  private persistSession(res: LoginResponse): void {
    localStorage.setItem(ACCESS_KEY, res.accessToken);
    localStorage.setItem(REFRESH_KEY, res.refreshToken);
    localStorage.setItem(USER_KEY, JSON.stringify(res.user));
    this.tokenSignal.set(res.accessToken);
    this.userSignal.set(res.user);
    this.avatarSignal.set(this.readAvatar(res.user.id));
  }

  private readUser(): AuthUser | null {
    try {
      const raw = localStorage.getItem(USER_KEY);
      return raw ? (JSON.parse(raw) as AuthUser) : null;
    } catch {
      return null;
    }
  }

  updateAvatar(dataUrl: string): void {
    const user = this.userSignal();
    if (!user) return;
    try {
      localStorage.setItem(`gos.avatar.${user.id}`, dataUrl);
      this.avatarSignal.set(dataUrl);
    } catch {
      console.warn('Failed to save avatar (quota exceeded)');
    }
  }

  private readAvatar(userId?: string): string | null {
    if (!userId) return null;
    return localStorage.getItem(`gos.avatar.${userId}`);
  }
}
