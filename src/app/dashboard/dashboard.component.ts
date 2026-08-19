import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../auth/auth.service';
import { UserService, DashboardStats, ResourceManager } from '../users/user.service';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent implements OnInit {
  private authService = inject(AuthService);
  private userService = inject(UserService);
  private router = inject(Router);
  private fb = inject(FormBuilder);

  currentUser = this.authService.currentUser;
  showAddUserModal = signal(false);
  isSubmitting = signal(false);
  successMessage = signal('');
  errorMessage = signal('');

  stats = signal<DashboardStats>({
    totalEmployees: 0,
    activeProjects: 0,
    benchEngineers: 0,
    allocatedEngineers: 0,
    openRequests: 0,
    availableEngineers: 0, // kept for interface compat, always 0
    completedProjects: 0
  });

  addUserForm: FormGroup = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    role: ['employee', Validators.required],
    designation: ['', Validators.required],
    department: [''],
    experience: [null],
    status: ['bench']
  });

  get selectedRole() {
    return this.addUserForm.get('role')?.value;
  }

  ngOnInit(): void {
    this.loadStats();
  }

  loadStats(): void {
    forkJoin({
      employees: this.userService.getEmployees(),
      projects: this.userService.getProjects(),
      requests: this.userService.getRequests()
    }).subscribe(({ employees, projects, requests }) => {
      this.stats.set({
        totalEmployees: employees.length,
        activeProjects: projects.filter(p => p.status === 'active').length,
        benchEngineers: employees.filter(e => e.status === 'bench').length,
        allocatedEngineers: employees.filter(e => e.status === 'allocated').length,
        openRequests: requests.filter(r => r.status === 'open').length,
        availableEngineers: 0,
        completedProjects: projects.filter(p => p.status === 'completed').length
      });
    });
  }

  openAddUserModal(): void {
    this.addUserForm.reset({ role: 'employee', status: 'bench' });
    this.successMessage.set('');
    this.errorMessage.set('');
    this.showAddUserModal.set(true);
  }

  closeModal(): void {
    this.showAddUserModal.set(false);
  }

  onSubmitUser(): void {
    if (this.addUserForm.invalid) return;
    this.isSubmitting.set(true);
    this.errorMessage.set('');

    const formVal = this.addUserForm.value;

    if (formVal.role === 'employee') {
      const employee = {
        name: formVal.name,
        email: formVal.email,
        password: formVal.password,
        role: 'employee' as const,
        designation: formVal.designation,
        status: formVal.status || 'bench',
        project: '',
        skills: [],
        experience: formVal.experience || 0
      };
      this.userService.addEmployee(employee).subscribe({
        next: () => {
          this.isSubmitting.set(false);
          this.successMessage.set(`Employee "${formVal.name}" added successfully!`);
          this.loadStats();
          setTimeout(() => this.closeModal(), 1500);
        },
        error: () => {
          this.isSubmitting.set(false);
          this.errorMessage.set('Failed to add user. Please try again.');
        }
      });
    } else if (formVal.role === 'dm') {
      const dm = {
        name: formVal.name,
        email: formVal.email,
        password: formVal.password,
        role: 'dm' as const,
        designation: formVal.designation,
        department: formVal.department || ''
      };
      this.userService.addDeliveryManager(dm).subscribe({
        next: () => {
          this.isSubmitting.set(false);
          this.successMessage.set(`Delivery Manager "${formVal.name}" added successfully!`);
          setTimeout(() => this.closeModal(), 1500);
        },
        error: () => {
          this.isSubmitting.set(false);
          this.errorMessage.set('Failed to add user. Please try again.');
        }
      });
    } else {
      const rm: ResourceManager = {
        name: formVal.name,
        email: formVal.email,
        password: formVal.password,
        role: 'rm' as const,
        designation: formVal.designation,
        department: formVal.department || '',
        experience: formVal.experience || 0
      };
      this.userService.addResourceManager(rm).subscribe({
        next: () => {
          this.isSubmitting.set(false);
          this.successMessage.set(`Resource Manager "${formVal.name}" added successfully!`);
          setTimeout(() => this.closeModal(), 1500);
        },
        error: () => {
          this.isSubmitting.set(false);
          this.errorMessage.set('Failed to add user. Please try again.');
        }
      });
    }
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  navigateTo(path: string, status?: string): void {
    const queryParams = status ? { status } : {};
    this.router.navigate([`/${path}`], { queryParams });
  }
}
