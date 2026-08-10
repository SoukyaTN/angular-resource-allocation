import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError, of } from 'rxjs';
import { tap, catchError, map, switchMap } from 'rxjs/operators';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  id?: number;
  email: string;
  name?: string;
  role?: string;
  token?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private baseUrl = 'http://localhost:3000';
  isAuthenticated = signal(false);
  currentUser = signal<LoginResponse | null>(null);

  constructor(private http: HttpClient) {
    this.loadAuthState();
  }

  login(credentials: LoginRequest): Observable<LoginResponse> {
    return this.http
      .get<any[]>(`${this.baseUrl}/admins`)
      .pipe(
        catchError(() => of([])),
        switchMap((admins: any[]) => {
          const admin = admins.find(
            a => a.email === credentials.email && a.password === credentials.password
          );
          if (admin) return of(admin as LoginResponse);
          return this.http.get<any[]>(`${this.baseUrl}/employees`).pipe(
            catchError(() => of([])),
            map((emps: any[]) => {
              const emp = emps.find(
                e => e.email === credentials.email && e.password === credentials.password
              );
              if (emp) return emp as LoginResponse;
              throw new Error('Invalid credentials');
            })
          );
        }),
        tap((user: LoginResponse) => {
          this.isAuthenticated.set(true);
          this.currentUser.set(user);
          localStorage.setItem('authUser', JSON.stringify(user));
          localStorage.setItem('isAuthenticated', 'true');
        }),
        catchError(() => {
          this.isAuthenticated.set(false);
          this.currentUser.set(null);
          return throwError(() => new Error('Invalid email or password.'));
        })
      );
  }

  logout(): void {
    this.isAuthenticated.set(false);
    this.currentUser.set(null);
    localStorage.removeItem('authUser');
    localStorage.removeItem('isAuthenticated');
  }

  private loadAuthState(): void {
    const authUser = localStorage.getItem('authUser');
    const isAuth = localStorage.getItem('isAuthenticated');
    if (authUser && isAuth === 'true') {
      this.currentUser.set(JSON.parse(authUser));
      this.isAuthenticated.set(true);
    }
  }

  getAuthStatus(): boolean {
    return this.isAuthenticated();
  }
}
