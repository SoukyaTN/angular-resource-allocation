import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { UserService } from '../users/user.service';

@Component({
  selector: 'app-requests-list',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './requests-list.component.html',
  styleUrl: './requests-list.component.css'
})
export class RequestsListComponent implements OnInit {
  private userService = inject(UserService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  requests = signal<any[]>([]);
  statusFilter = signal<string>('all');
  isLoading = signal(true);

  get pageTitle(): string {
    const filter = this.statusFilter();
    if (filter === 'open') return 'Open Requests';
    if (filter === 'closed') return 'Closed Requests';
    return 'All Requests';
  }

  get filteredRequests(): any[] {
    const filter = this.statusFilter();
    const all = this.requests();
    return filter === 'all' ? all : all.filter(r => r.status === filter);
  }

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      this.statusFilter.set(params['status'] || 'all');
    });
    this.userService.getRequests().subscribe({
      next: (data) => { this.requests.set(data); this.isLoading.set(false); },
      error: () => this.isLoading.set(false)
    });
  }

  getStatusClass(status: string): string {
    return status === 'open' ? 'badge-green' : 'badge-gray';
  }

  getPriorityClass(priority: string): string {
    return { high: 'badge-red', medium: 'badge-orange', low: 'badge-blue' }[priority] || 'badge-gray';
  }

  goBack(): void {
    this.router.navigate(['/dashboard']);
  }
}
