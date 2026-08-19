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
  activeTab = signal<'bench' | 'allocated' | 'positions'>('positions');

  allEmployees = signal<any[]>([]);
  allProjects = signal<any[]>([]);
  allRequests = signal<any[]>([]);
  isLoading = signal(true);

  // Search state per tab
  positionSearch = '';
  positionPriority = 'all';
  benchSearch = '';
  allocatedSearch = '';

  // Allocate to position modal
  showPositionAllocateModal = signal(false);
  selectedPosition = signal<any>(null);
  positionAllocateForm!: FormGroup;
  isSubmitting = signal(false);
  successMessage = signal('');
  errorMessage = signal('');

  get availableCount() { return 0; } // 'available' status removed
  get benchCount() { return this.allEmployees().filter(e => e.status === 'bench' && e.role === 'employee').length; }
  get allocatedCount() { return this.allEmployees().filter(e => e.status === 'allocated' && e.role === 'employee').length; }
  get activeProjectCount() { return this.allProjects().filter(p => p.status === 'active').length; }
  get openPositionCount() { return this.allRequests().filter(r => r.status === 'open').length; }

  get benchAndAvailableEngineers() {
    return this.allEmployees().filter(e => e.status === 'bench' && e.role === 'employee');
  }

  get allocatedEngineers() {
    return this.allEmployees().filter(e => e.status === 'allocated' && e.role === 'employee');
  }

  get activeProjects() {
    return this.allProjects().filter(p => p.status === 'active');
  }

  get openPositions() {
    return this.allRequests().filter(r => r.status === 'open');
  }

  get filteredPositions() {
    const q = this.positionSearch.toLowerCase();
    return this.openPositions.filter(p =>
      (!q || p.title.toLowerCase().includes(q) ||
        (p.required_skills || []).some((s: string) => s.toLowerCase().includes(q))) &&
      (this.positionPriority === 'all' || p.priority === this.positionPriority)
    );
  }

  get filteredBench() {
    const q = this.benchSearch.toLowerCase();
    return this.benchAndAvailableEngineers.filter(e =>
      !q ||
      e.name.toLowerCase().includes(q) ||
      e.designation.toLowerCase().includes(q) ||
      (e.skills || []).some((s: string) => s.toLowerCase().includes(q))
    );
  }

  get filteredAllocated() {
    const q = this.allocatedSearch.toLowerCase();
    return this.allocatedEngineers.filter(e =>
      !q ||
      e.name.toLowerCase().includes(q) ||
      e.designation.toLowerCase().includes(q) ||
      (e.project || '').toLowerCase().includes(q) ||
      (e.skills || []).some((s: string) => s.toLowerCase().includes(q))
    );
  }

  get availableEngineers() {
    return this.allEmployees().filter(e => e.status === 'bench' && e.role === 'employee');
  }

  /** Returns available engineers sorted by how many required skills they match for the given position */
  getCandidatesForPosition(pos: any): any[] {
    const required: string[] = (pos.required_skills || []).map((s: string) => s.toLowerCase());
    return this.availableEngineers
      .map(emp => {
        const empSkills: string[] = (emp.skills || []).map((s: string) => s.toLowerCase());
        const matched = required.filter(r => empSkills.some(e => e.includes(r) || r.includes(e)));
        return { ...emp, _matchCount: matched.length, _matchedSkills: matched, _totalRequired: required.length };
      })
      .sort((a, b) => b._matchCount - a._matchCount);
  }

  getMatchPercent(emp: any): number {
    if (!emp._totalRequired) return 0;
    return Math.round((emp._matchCount / emp._totalRequired) * 100);
  }

  getMatchClass(emp: any): string {
    const p = this.getMatchPercent(emp);
    if (p >= 80) return 'match-high';
    if (p >= 40) return 'match-medium';
    return 'match-low';
  }

  positionCandidates = signal<any[]>([]);

  ngOnInit(): void {
    this.positionAllocateForm = this.fb.group({
      employee: ['', Validators.required]
    });
    this.loadData();
  }

  loadData(): void {
    this.isLoading.set(true);
    forkJoin({
      employees: this.userService.getEmployees(),
      projects: this.userService.getProjects(),
      requests: this.userService.getRequests()
    }).subscribe(({ employees, projects, requests }) => {
      this.allEmployees.set(employees as any[]);
      this.allProjects.set(projects);
      this.allRequests.set(requests);
      this.isLoading.set(false);
    });
  }

  releaseEngineer(emp: any): void {
    if (!confirm(`Release ${emp.name} from ${emp.project}?`)) return;
    const updated = { ...emp, status: 'bench', project: '' };
    this.userService.updateEmployee(emp.id, updated).subscribe(() => this.loadData());
  }

  moveToBench(emp: any): void {
    if (!confirm(`Move ${emp.name} to bench?`)) return;
    const updated = { ...emp, status: 'bench', project: '' };
    this.userService.updateEmployee(emp.id, updated).subscribe(() => this.loadData());
  }

  openPositionModal(pos: any): void {
    this.selectedPosition.set(pos);
    this.positionAllocateForm.reset({ employee: '' });
    this.successMessage.set('');
    this.errorMessage.set('');
    this.positionCandidates.set(this.getCandidatesForPosition(pos));
    this.showPositionAllocateModal.set(true);
  }

  submitPositionAllocate(): void {
    const empId = this.positionAllocateForm.get('employee')?.value;
    if (!empId) return;
    this.isSubmitting.set(true);
    const emp = this.allEmployees().find(e => String(e.id) === String(empId));
    const pos = this.selectedPosition();
    if (!emp) { this.isSubmitting.set(false); return; }
    const updated = { ...emp, status: 'allocated', project: pos.title };
    this.userService.updateEmployee(emp.id, updated).subscribe({
      next: () => {
        this.userService.updateRequest(pos.id, { ...pos, status: 'closed' }).subscribe({
          next: () => {
            this.isSubmitting.set(false);
            this.successMessage.set(`${emp.name} allocated to ${pos.title}!`);
            this.loadData();
            setTimeout(() => this.showPositionAllocateModal.set(false), 1500);
          },
          error: () => { this.isSubmitting.set(false); this.errorMessage.set('Failed to close position.'); }
        });
      },
      error: () => { this.isSubmitting.set(false); this.errorMessage.set('Failed to allocate engineer.'); }
    });
  }

  getStatusClass(status: string): string {
    const m: Record<string, string> = { allocated: 'badge-green', bench: 'badge-orange' };
    return m[status] || 'badge-gray';
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
