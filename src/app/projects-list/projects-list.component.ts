import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { UserService } from '../users/user.service';

@Component({
  selector: 'app-projects-list',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './projects-list.component.html',
  styleUrl: './projects-list.component.css'
})
export class ProjectsListComponent implements OnInit {
  private userService = inject(UserService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  projects = signal<any[]>([]);
  statusFilter = signal<string>('all');
  isLoading = signal(true);

  get pageTitle(): string {
    const filter = this.statusFilter();
    if (filter === 'active') return 'Active Projects';
    if (filter === 'completed') return 'Completed Projects';
    return 'All Projects';
  }

  get filteredProjects(): any[] {
    const filter = this.statusFilter();
    const all = this.projects();
    return filter === 'all' ? all : all.filter(p => p.status === filter);
  }

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      this.statusFilter.set(params['status'] || 'all');
    });
    this.userService.getProjects().subscribe({
      next: (data) => { this.projects.set(data); this.isLoading.set(false); },
      error: () => this.isLoading.set(false)
    });
  }

  getStatusClass(status: string): string {
    return status === 'active' ? 'badge-green' : 'badge-gray';
  }

  goBack(): void {
    this.router.navigate(['/dashboard']);
  }
}
