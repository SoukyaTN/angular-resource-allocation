import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../auth/auth.service';
import { UserService } from '../users/user.service';

@Component({
  selector: 'app-dm-dashboard',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './dm-dashboard.component.html',
  styleUrl: './dm-dashboard.component.css'
})
export class DmDashboardComponent implements OnInit {
  private authService = inject(AuthService);
  private userService = inject(UserService);
  private router = inject(Router);
  private fb = inject(FormBuilder);

  currentUser = this.authService.currentUser;
  activeTab = signal<'projects' | 'requests'>('projects');
  allProjects = signal<any[]>([]);
  allRequests = signal<any[]>([]);
  isLoading = signal(true);

  showCreateProjectModal = signal(false);
  showCreateRequestModal = signal(false);
  showEditProjectModal = signal(false);
  selectedProject = signal<any>(null);

  successMessage = signal('');
  errorMessage = signal('');
  isSubmitting = signal(false);

  createProjectForm!: FormGroup;
  createRequestForm!: FormGroup;
  editProjectForm!: FormGroup;

  get activeProjectCount() { return this.allProjects().filter(p => p.status === 'active').length; }
  get completedProjectCount() { return this.allProjects().filter(p => p.status === 'completed').length; }
  get openRequestCount() { return this.allRequests().filter(r => r.status === 'open').length; }
  get totalTeamMembers() {
    return this.allProjects().filter(p => p.status === 'active').reduce((sum, p) => sum + (p.team_size || 0), 0);
  }

  ngOnInit(): void {
    this.createProjectForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      team_size: [1, [Validators.required, Validators.min(1)]],
      status: ['active'],
      progress: [0]
    });
    this.createRequestForm = this.fb.group({
      title: ['', [Validators.required, Validators.minLength(3)]],
      priority: ['medium', Validators.required]
    });
    this.editProjectForm = this.fb.group({
      status: ['active'],
      progress: [0, [Validators.min(0), Validators.max(100)]],
      team_size: [1, [Validators.min(1)]]
    });
    this.loadData();
  }

  loadData(): void {
    const dmId = this.currentUser()?.id;
    if (!dmId) return;
    this.isLoading.set(true);
    this.userService.getProjectsByDM(dmId).subscribe(projects => {
      this.allProjects.set(projects);
      this.userService.getRequestsByDM(dmId).subscribe(requests => {
        this.allRequests.set(requests);
        this.isLoading.set(false);
      });
    });
  }

  openCreateProject(): void {
    this.createProjectForm.reset({ status: 'active', progress: 0, team_size: 1 });
    this.successMessage.set(''); this.errorMessage.set('');
    this.showCreateProjectModal.set(true);
  }

  submitCreateProject(): void {
    if (this.createProjectForm.invalid) return;
    this.isSubmitting.set(true);
    const proj = { ...this.createProjectForm.value, dm_id: this.currentUser()?.id };
    this.userService.createProject(proj).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.successMessage.set('Project created successfully!');
        this.loadData();
        setTimeout(() => this.showCreateProjectModal.set(false), 1500);
      },
      error: () => { this.isSubmitting.set(false); this.errorMessage.set('Failed to create project.'); }
    });
  }

  openCreateRequest(): void {
    this.createRequestForm.reset({ priority: 'medium' });
    this.successMessage.set(''); this.errorMessage.set('');
    this.showCreateRequestModal.set(true);
  }

  submitCreateRequest(): void {
    if (this.createRequestForm.invalid) return;
    this.isSubmitting.set(true);
    const req = { ...this.createRequestForm.value, status: 'open', dm_id: this.currentUser()?.id };
    this.userService.createRequest(req).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.successMessage.set('Request submitted successfully!');
        this.loadData();
        setTimeout(() => this.showCreateRequestModal.set(false), 1500);
      },
      error: () => { this.isSubmitting.set(false); this.errorMessage.set('Failed to submit request.'); }
    });
  }

  openEditProject(project: any): void {
    this.selectedProject.set(project);
    this.editProjectForm.patchValue({ status: project.status, progress: project.progress || 0, team_size: project.team_size });
    this.successMessage.set(''); this.errorMessage.set('');
    this.showEditProjectModal.set(true);
  }

  submitEditProject(): void {
    if (this.editProjectForm.invalid) return;
    this.isSubmitting.set(true);
    const updated = { ...this.selectedProject(), ...this.editProjectForm.value };
    this.userService.updateProject(updated.id, updated).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.successMessage.set('Project updated!');
        this.loadData();
        setTimeout(() => this.showEditProjectModal.set(false), 1500);
      },
      error: () => { this.isSubmitting.set(false); this.errorMessage.set('Failed to update project.'); }
    });
  }

  closeRequest(request: any): void {
    this.userService.updateRequest(request.id, { ...request, status: 'closed' }).subscribe(() => this.loadData());
  }

  deleteProject(id: number): void {
    if (!confirm('Delete this project?')) return;
    this.userService.deleteProject(id).subscribe(() => this.loadData());
  }

  getStatusClass(status: string): string {
    const m: Record<string, string> = { active: 'badge-green', completed: 'badge-indigo', open: 'badge-green', closed: 'badge-gray' };
    return m[status] || 'badge-gray';
  }

  getPriorityClass(priority: string): string {
    const m: Record<string, string> = { high: 'badge-red', medium: 'badge-orange', low: 'badge-blue' };
    return m[priority] || 'badge-gray';
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
