import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../auth/auth.service';
import { UserService } from '../users/user.service';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-employee-dashboard',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './employee-dashboard.component.html',
  styleUrl: './employee-dashboard.component.css'
})
export class EmployeeDashboardComponent implements OnInit {
  private authService = inject(AuthService);
  private userService = inject(UserService);
  private router = inject(Router);

  currentUser = this.authService.currentUser;
  employeeProfile = signal<any>(null);
  projectInfo = signal<any>(null);
  openPositions = signal<any[]>([]);
  isLoading = signal(true);

  // Skills editing
  showSkillsModal = signal(false);
  editableSkills = signal<string[]>([]);
  newSkillInput = '';
  isSubmitting = signal(false);
  successMessage = signal('');
  errorMessage = signal('');

  get statusClass(): string {
    const s = this.employeeProfile()?.status;
    const m: Record<string, string> = { allocated: 'status-allocated', bench: 'status-bench' };
    return m[s] || '';
  }

  get statusIcon(): string {
    const s = this.employeeProfile()?.status;
    const m: Record<string, string> = { allocated: '✅', bench: '🧑‍💻', available: '🎯' };
    return m[s] || '—';
  }

  ngOnInit(): void {
    this.loadProfile();
  }

  loadProfile(): void {
    this.isLoading.set(true);
    const userId = this.currentUser()?.id;

    forkJoin({
      employees: this.userService.getEmployees(),
      projects: this.userService.getProjects(),
      requests: this.userService.getRequests()
    }).subscribe(({ employees, projects, requests }) => {
      const me = (employees as any[]).find(e => String(e.id) === String(userId));
      if (me) {
        this.employeeProfile.set(me);
        if (me.project) {
          const proj = projects.find(p => p.name === me.project);
          this.projectInfo.set(proj || null);
        }
        // Enrich open positions with skill match data
        const mySkills: string[] = (me.skills || []).map((s: string) => s.toLowerCase());
        const enriched = (requests as any[])
          .filter(r => r.status === 'open')
          .map(r => {
            const required: string[] = (r.required_skills || []).map((s: string) => s.toLowerCase());
            const matched = required.filter(req => mySkills.some(ms => ms.includes(req) || req.includes(ms)));
            const gap = (r.required_skills || []).filter((_: string, i: number) => !matched.includes(required[i]));
            const pct = required.length ? Math.round((matched.length / required.length) * 100) : 0;
            return { ...r, _matched: matched.length, _total: required.length, _pct: pct, _gap: gap };
          })
          .sort((a, b) => b._pct - a._pct);
        this.openPositions.set(enriched);
      }
      this.isLoading.set(false);
    });
  }

  openSkillsModal(): void {
    this.editableSkills.set([...(this.employeeProfile()?.skills || [])]);
    this.newSkillInput = '';
    this.successMessage.set('');
    this.errorMessage.set('');
    this.showSkillsModal.set(true);
  }

  addSkill(): void {
    const skill = this.newSkillInput.trim();
    if (!skill) return;
    if (this.editableSkills().some(s => s.toLowerCase() === skill.toLowerCase())) return;
    this.editableSkills.update(skills => [...skills, skill]);
    this.newSkillInput = '';
  }

  removeSkill(skill: string): void {
    this.editableSkills.update(skills => skills.filter(s => s !== skill));
  }

  saveSkills(): void {
    this.isSubmitting.set(true);
    const profile = this.employeeProfile();
    const updated = { ...profile, skills: this.editableSkills() };
    this.userService.updateEmployee(profile.id, updated).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.successMessage.set('Skills updated successfully!');
        this.loadProfile();
        setTimeout(() => this.showSkillsModal.set(false), 1500);
      },
      error: () => {
        this.isSubmitting.set(false);
        this.errorMessage.set('Failed to update skills.');
      }
    });
  }

  getMatchClass(pct: number): string {
    if (pct >= 80) return 'match-high';
    if (pct >= 40) return 'match-medium';
    return 'match-low';
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
