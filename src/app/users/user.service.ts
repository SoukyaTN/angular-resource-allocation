import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface Employee {
  id?: number;
  name: string;
  email: string;
  password: string;
  role: 'employee';
  designation: string;
  status: 'allocated' | 'bench' | 'available';
  project: string;
  skills: string[];
  experience: number;
}

export interface DeliveryManager {
  id?: number;
  name: string;
  email: string;
  password: string;
  role: 'dm';
  designation: string;
  department: string;
}

export interface ResourceManager {
  id?: number;
  name: string;
  email: string;
  password: string;
  role: 'rm';
  designation: string;
  department: string;
  experience: number;
}

export interface DashboardStats {
  totalEmployees: number;
  activeProjects: number;
  benchEngineers: number;
  allocatedEngineers: number;
  openRequests: number;
  availableEngineers: number;
  completedProjects: number;
}

@Injectable({ providedIn: 'root' })
export class UserService {
  private apiUrl = 'http://localhost:3000';

  constructor(private http: HttpClient) {}

  getEmployees(): Observable<Employee[]> {
    return this.http.get<Employee[]>(`${this.apiUrl}/employees`);
  }

  getDeliveryManagers(): Observable<DeliveryManager[]> {
    return this.http.get<DeliveryManager[]>(`${this.apiUrl}/delivery_managers`);
  }

  getProjects(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/projects`);
  }

  getRequests(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/requests`);
  }

  addEmployee(employee: Employee): Observable<Employee> {
    return this.http.post<Employee>(`${this.apiUrl}/employees`, employee);
  }

  addDeliveryManager(dm: DeliveryManager): Observable<DeliveryManager> {
    return this.http.post<DeliveryManager>(`${this.apiUrl}/delivery_managers`, dm);
  }

  addResourceManager(rm: ResourceManager): Observable<ResourceManager> {
    return this.http.post<ResourceManager>(`${this.apiUrl}/resource_managers`, rm);
  }

  getProjectsByDM(dmId: any): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/projects`).pipe(
      map(projects => projects.filter(p => String(p.dm_id) === String(dmId)))
    );
  }

  getRequestsByDM(dmId: any): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/requests`).pipe(
      map(requests => requests.filter(r => String(r.dm_id) === String(dmId)))
    );
  }

  createProject(project: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/projects`, project);
  }

  createRequest(request: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/requests`, request);
  }

  updateProject(id: number, project: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/projects/${id}`, project);
  }

  updateRequest(id: number, request: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/requests/${id}`, request);
  }

  deleteProject(id: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/projects/${id}`);
  }

  updateEmployee(id: any, employee: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/employees/${id}`, employee);
  }
}
