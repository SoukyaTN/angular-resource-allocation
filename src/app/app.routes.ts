import { Routes } from '@angular/router';
import { LoginComponent } from './auth/login.component';
import { DashboardComponent } from './dashboard/dashboard.component';
import { DmDashboardComponent } from './dm-dashboard/dm-dashboard.component';
import { RmDashboardComponent } from './rm-dashboard/rm-dashboard.component';
import { EmployeeDashboardComponent } from './employee-dashboard/employee-dashboard.component';
import { EmployeesListComponent } from './employees-list/employees-list.component';
import { ProjectsListComponent } from './projects-list/projects-list.component';
import { RequestsListComponent } from './requests-list/requests-list.component';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  { path: 'dashboard', component: DashboardComponent },
  { path: 'dm-dashboard', component: DmDashboardComponent },
  { path: 'rm-dashboard', component: RmDashboardComponent },
  { path: 'employee-dashboard', component: EmployeeDashboardComponent },
  { path: 'employees', component: EmployeesListComponent },
  { path: 'projects', component: ProjectsListComponent },
  { path: 'requests', component: RequestsListComponent }
];
