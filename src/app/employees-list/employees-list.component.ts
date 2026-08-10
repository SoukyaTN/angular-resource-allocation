import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { UserService, Employee } from '../users/user.service';

@Component({
  selector: 'app-employees-list',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './employees-list.component.html',
  styleUrl: './employees-list.component.css'
})
export class EmployeesListComponent implements OnInit {
  private userService = inject(UserService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  employees = signal<Employee[]>([]);
  statusFilter = signal<string>('all');
  isLoading = signal(true);

  get pageTitle(): string {
    const filter = this.statusFilter();
    if (filter === 'bench') return 'Bench Engineers';
    if (filter === 'allocated') return 'Allocated Engineers';
    if (filter === 'available') return 'Available Engineers';
    return 'All Employees';
  }

  get filteredEmployees(): Employee[] {
    const filter = this.statusFilter();
    const all = this.employees();
    return filter === 'all' ? all : all.filter(e => e.status === filter);
  }

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      this.statusFilter.set(params['status'] || 'all');
    });
    this.userService.getEmployees().subscribe({
      next: (data) => { this.employees.set(data); this.isLoading.set(false); },
      error: () => this.isLoading.set(false)
    });
  }

  getStatusClass(status: string): string {
    return { allocated: 'badge-green', bench: 'badge-orange', available: 'badge-blue' }[status] || 'badge-gray';
  }

  goBack(): void {
    this.router.navigate(['/dashboard']);
  }
}
