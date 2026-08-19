import { Component, OnDestroy, AfterViewInit, ElementRef, ViewChild, signal, Input, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';

interface GraphNode {
  id: string;
  name: string;
  status: string;
  skills: string[];
  experience: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
}

interface GraphEdge {
  source: GraphNode;
  target: GraphNode;
  sharedSkills: string[];
}

@Component({
  selector: 'app-skills-graph',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './skills-graph.component.html',
  styleUrl: './skills-graph.component.css'
})
export class SkillsGraphComponent implements AfterViewInit, OnDestroy, OnChanges {
  @ViewChild('graphCanvas') canvasRef!: ElementRef<HTMLCanvasElement>;
  @Input() employees: any[] = [];
  @Input() openPositions: any[] = [];

  nodes: GraphNode[] = [];
  edges: GraphEdge[] = [];
  selectedNode = signal<GraphNode | null>(null);

  private animFrame = 0;
  private initialized = false;

  ngAfterViewInit(): void {
    this.buildGraph();
    this.startAnimation();
    this.canvasRef.nativeElement.addEventListener('click', this.onCanvasClick);
    this.canvasRef.nativeElement.addEventListener('mousemove', this.onCanvasMouseMove);
    this.initialized = true;
  }

  ngOnChanges(): void {
    if (this.initialized) {
      this.buildGraph();
    }
  }

  ngOnDestroy(): void {
    cancelAnimationFrame(this.animFrame);
    if (this.canvasRef?.nativeElement) {
      this.canvasRef.nativeElement.removeEventListener('click', this.onCanvasClick);
      this.canvasRef.nativeElement.removeEventListener('mousemove', this.onCanvasMouseMove);
    }
  }

  buildGraph(): void {
    if (!this.canvasRef?.nativeElement) return;
    const { width: W, height: H } = this.canvasRef.nativeElement;

    this.nodes = this.employees
      .filter(e => e.role === 'employee')
      .map(e => ({
        id: String(e.id),
        name: e.name,
        status: e.status,
        skills: (e.skills || []).map((s: string) => s.toLowerCase()),
        experience: e.experience || 0,
        x: Math.random() * (W - 140) + 70,
        y: Math.random() * (H - 140) + 70,
        vx: 0, vy: 0,
        radius: Math.max(24, Math.min(40, 18 + (e.skills?.length || 0) * 2.5))
      }));

    this.edges = [];
    for (let i = 0; i < this.nodes.length; i++) {
      for (let j = i + 1; j < this.nodes.length; j++) {
        const shared = this.nodes[i].skills.filter(s =>
          this.nodes[j].skills.some(t => t.includes(s) || s.includes(t))
        );
        if (shared.length > 0) {
          this.edges.push({ source: this.nodes[i], target: this.nodes[j], sharedSkills: shared });
        }
      }
    }
  }

  private startAnimation(): void {
    const tick = () => {
      this.simulate();
      this.draw();
      this.animFrame = requestAnimationFrame(tick);
    };
    tick();
  }

  private simulate(): void {
    const { width: W, height: H } = this.canvasRef.nativeElement;

    // Coulomb repulsion
    for (let i = 0; i < this.nodes.length; i++) {
      for (let j = i + 1; j < this.nodes.length; j++) {
        const dx = this.nodes[j].x - this.nodes[i].x;
        const dy = this.nodes[j].y - this.nodes[i].y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const force = 3200 / (dist * dist);
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;
        this.nodes[i].vx -= fx; this.nodes[i].vy -= fy;
        this.nodes[j].vx += fx; this.nodes[j].vy += fy;
      }
    }

    // Hooke attraction on edges
    for (const edge of this.edges) {
      const dx = edge.target.x - edge.source.x;
      const dy = edge.target.y - edge.source.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      const rest = 160;
      const k = 0.025 * (dist - rest) / dist;
      edge.source.vx += dx * k; edge.source.vy += dy * k;
      edge.target.vx -= dx * k; edge.target.vy -= dy * k;
    }

    // Center gravity + damping + boundary clamp
    for (const n of this.nodes) {
      n.vx += (W / 2 - n.x) * 0.004;
      n.vy += (H / 2 - n.y) * 0.004;
      n.vx *= 0.82; n.vy *= 0.82;
      n.x = Math.max(n.radius + 4, Math.min(W - n.radius - 4, n.x + n.vx));
      n.y = Math.max(n.radius + 4, Math.min(H - n.radius - 4, n.y + n.vy));
    }
  }

  private draw(): void {
    const canvas = this.canvasRef.nativeElement;
    const ctx = canvas.getContext('2d')!;
    const { width: W, height: H } = canvas;
    ctx.clearRect(0, 0, W, H);

    // Background grid
    ctx.strokeStyle = '#edf2f7';
    ctx.lineWidth = 1;
    for (let x = 0; x < W; x += 50) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
    }
    for (let y = 0; y < H; y += 50) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }

    // Edges with gradient color
    for (const edge of this.edges) {
      const alpha = Math.min(0.75, 0.15 + edge.sharedSkills.length * 0.18);
      const grad = ctx.createLinearGradient(edge.source.x, edge.source.y, edge.target.x, edge.target.y);
      const sc = edge.source.status === 'allocated' ? `rgba(72,187,120,${alpha})` : `rgba(237,137,54,${alpha})`;
      const tc = edge.target.status === 'allocated' ? `rgba(72,187,120,${alpha})` : `rgba(237,137,54,${alpha})`;
      grad.addColorStop(0, sc);
      grad.addColorStop(1, tc);
      ctx.strokeStyle = grad;
      ctx.lineWidth = Math.min(6, edge.sharedSkills.length * 1.8);
      ctx.beginPath();
      ctx.moveTo(edge.source.x, edge.source.y);
      ctx.lineTo(edge.target.x, edge.target.y);
      ctx.stroke();

      // Badge for 2+ shared skills
      if (edge.sharedSkills.length >= 2) {
        const mx = (edge.source.x + edge.target.x) / 2;
        const my = (edge.source.y + edge.target.y) / 2;
        ctx.fillStyle = 'rgba(255,255,255,0.92)';
        ctx.beginPath();
        ctx.arc(mx, my, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#cbd5e0';
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.fillStyle = '#4a5568';
        ctx.font = 'bold 9px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(String(edge.sharedSkills.length), mx, my);
      }
    }

    // Nodes
    for (const node of this.nodes) {
      const isSel = this.selectedNode()?.id === node.id;
      const isAlloc = node.status === 'allocated';

      // Selection ring
      if (isSel) {
        ctx.shadowColor = '#1a1a2e';
        ctx.shadowBlur = 18;
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius + 7, 0, Math.PI * 2);
        ctx.strokeStyle = '#1a1a2e';
        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.shadowBlur = 0;
      }

      // Radial gradient fill
      const rg = ctx.createRadialGradient(
        node.x - node.radius * 0.28, node.y - node.radius * 0.28, 2,
        node.x, node.y, node.radius
      );
      rg.addColorStop(0, isAlloc ? '#9ae6b4' : '#fbd38d');
      rg.addColorStop(1, isAlloc ? '#48bb78' : '#ed8936');
      ctx.beginPath();
      ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
      ctx.fillStyle = rg;
      ctx.fill();
      ctx.strokeStyle = isAlloc ? '#276749' : '#9c4221';
      ctx.lineWidth = 2;
      ctx.stroke();

      // First name
      const fontSize = Math.max(9, Math.min(13, node.radius * 0.46));
      ctx.fillStyle = '#1a202c';
      ctx.font = `bold ${fontSize}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(node.name.split(' ')[0], node.x, node.y - 4);

      // Experience
      ctx.font = `${Math.max(8, fontSize - 2)}px sans-serif`;
      ctx.fillStyle = '#2d3748';
      ctx.fillText(`${node.experience}yr`, node.x, node.y + fontSize * 0.85);
    }

    ctx.textBaseline = 'alphabetic';
    ctx.shadowBlur = 0;
  }

  onCanvasClick = (e: MouseEvent): void => {
    const rect = this.canvasRef.nativeElement.getBoundingClientRect();
    const sx = this.canvasRef.nativeElement.width / rect.width;
    const sy = this.canvasRef.nativeElement.height / rect.height;
    const x = (e.clientX - rect.left) * sx;
    const y = (e.clientY - rect.top) * sy;
    const hit = this.nodes.find(n => Math.hypot(n.x - x, n.y - y) <= n.radius);
    this.selectedNode.set(hit || null);
  };

  onCanvasMouseMove = (e: MouseEvent): void => {
    const rect = this.canvasRef.nativeElement.getBoundingClientRect();
    const sx = this.canvasRef.nativeElement.width / rect.width;
    const sy = this.canvasRef.nativeElement.height / rect.height;
    const x = (e.clientX - rect.left) * sx;
    const y = (e.clientY - rect.top) * sy;
    const hit = this.nodes.find(n => Math.hypot(n.x - x, n.y - y) <= n.radius);
    this.canvasRef.nativeElement.style.cursor = hit ? 'pointer' : 'default';
  };

  getPositionMatches(node: GraphNode): { title: string; pct: number }[] {
    return this.openPositions.map(pos => {
      const req = (pos.required_skills || []).map((s: string) => s.toLowerCase());
      if (!req.length) return { title: pos.title, pct: 0 };
      const matched = req.filter((r: string) => node.skills.some(s => s.includes(r) || r.includes(s)));
      return { title: pos.title, pct: Math.round((matched.length / req.length) * 100) };
    }).sort((a, b) => b.pct - a.pct);
  }

  displaySkill(s: string): string {
    return s.charAt(0).toUpperCase() + s.slice(1);
  }
}
