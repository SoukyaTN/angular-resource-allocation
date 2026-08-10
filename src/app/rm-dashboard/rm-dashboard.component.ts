import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../auth/auth.service';
import { UserService } from '../users/user.service';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-rm-dashboard',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './rm-dashboard.component.html',
  styleUrl: './rm-dashboard.component.css'
})
export class RmDashboardComponent implements OnInit {
  private authService = inject(AuthService);
  private userService = inject(UserService);
  private router = inject(Router);
  private fb = inject(FormBuilder);

  currentUser = this.authService.currentUser;
  activeTab = signal<'search' | 'bench' | 'allocated'>('bench');

  allEmployees = signal<any[]>([]);
  allProjects = signal<any[]>([]);
  isLoading = signal(true);

  // Search filters
  searchSkill = '';
  searchMinExp: number | null = null;
  searchStatus = 'all';

  // Allocate modal
  showAllocateModal = signal(false);
  selectedEmployee = signal<any>(null);
  allocateForm!: FormGroup;
  isSubmitting = signal(false);
  successMessage = signal('');
  errorMessage = signal('');

  get availableCount() { return this.allEmployees().filter(e => e.status === 'available' && e.role === 'employee').length; }
  get benchCount() { return this.allEmployees().filter(e => e.status === 'bench' && e.role === 'employee').length; }
  get allocatedCount() { return this.allEmployees().filter(e => e.status === 'allocated' && e.role === 'employee').length; }
  get activeProjectCount() { return this.allProjects().filter(p => p.status === 'active').length; }

  get benchAndAvailableEngineers() {
    return this.allEmployees().filter(e =>
      (e.status === 'bench' || e.status === 'available') && e.role === 'employee'
    );
  }

  get allocatedEngineers() {
    return this.allEmployees().filter(e => e.status === 'allocated' && e.role === 'employee');
  }

  get activeProjects() {
    return this.allProjects().filter(p => p.status === 'active');
  }

  get searchResults() {
    return this.allEmployees().filter(e => {
      if (e.role !== 'employee') return false;
      const matchesSkill = !this.searchSkill ||
        (e.skills || []).some((s: string) => s.toLowerCase().includes(this.searchSkill.toLowerCase()));
      const matchesExp = !this.searchMinExp || e.experience >= this.searchMinExp;
      const matchesStatus = this.searchStatus === 'all' || e.status === this.searchStatus;
      return matchesSkill && matchesExp && matchesStatus;
    });
  }

  ngOnInit(): void {
    this.allocateForm = this.fb.group({
      project: ['', Validators.required]
    });
    this.loadData();
  }

  loadData(): void {
    this.isLoading.set(true);
    forkJoin({
      employees: this.userService.getEmployees(),
      projects: this.userService.getProjects()
    }).subscribe(({ employees, projects }) => {
      this.allEmployees.set(employees as any[]);
      this.allProjects.set(projects);
      this.isLoading.set(false);
    });
  }

  openAllocateModal(emp: any): void {
    this.selectedEmployee.set(emp);
    this.allocateForm.reset({ project: '' });
    this.successMessage.set('');
    this.errorMessage.set('');
    this.showAllocateModal.set(true);
  }

  submitAllocate(): void {
    const projectName = this.allocateForm.get('project')?.value;
    if (!projectName) return;
    this.isSubmitting.set(true);
    const emp = this.selectedEmployee();
    const updated = { ...emp, status: 'allocated', project: projectName };
    this.userService.updateEmployee(emp.id, updated).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.successMessage.set(`${emp.name} allocated to ${projectName}!`);
        this.loadData();
        setTimeout(() => this.showAllocateModal.set(false), 1500);
      },
      error: () => { this.isSubmitting.set(false); this.errorMessage.set('Failed to allocate engineer.'); }
    });
  }

  releaseEngineer(emp: any): void {
    if (!confirm(`Release ${emp.name} from ${emp.project}?`)) return;
    const updated = { ...emp, status: 'available', project: '' };
    this.userService.updateEmployee(emp.id, updated).subscribe(() => this.loadData());
  }

  moveToBench(emp: any): void {
    if (!confirm(`Move ${emp.name} to bench?`)) return;
    const updated = { ...emp, status: 'bench', project: '' };
    this.userService.updateEmployee(emp.id, updated).subscribe(() => this.loadData());
  }

  getStatusClass(status: string): string {
    const m: Record<string, string> = { allocated: 'badge-green', bench: 'badge-orange', available: 'badge-blue' };
    return m[status] || 'badge-gray';
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
