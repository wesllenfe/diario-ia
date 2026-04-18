import { Component, OnInit, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import {
  IonHeader, IonToolbar, IonContent, IonIcon, IonSpinner,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  flameOutline, trendingUpOutline, calendarOutline,
  sparklesOutline, pencilOutline,
} from 'ionicons/icons';
import { SupabaseService } from '../../services/supabase.service';
import { GroqService } from '../../services/groq.service';
import { DashboardService, DashboardData, DiaTendencia } from '../../services/dashboard.service';
import { BottomNavComponent } from '../../components/bottom-nav.component';
import { EMOCAO_EMOJI } from '../diario/diario.page';

// Dimensões fixas do SVG (viewBox)
const SVG_W = 300;
const SVG_H = 80;
const PAD_X = 6;

@Component({
  selector: 'app-dashboard',
  templateUrl: 'dashboard.page.html',
  styleUrls: ['dashboard.page.scss'],
  standalone: true,
  imports: [
    DecimalPipe,
    IonHeader, IonToolbar, IonContent, IonIcon, IonSpinner,
    BottomNavComponent,
  ],
})
export class DashboardPage implements OnInit {
  readonly Math = Math;
  carregando = signal(true);
  dados = signal<DashboardData | null>(null);
  insight = signal<string | null>(null);
  carregandoInsight = signal(false);
  readonly emojiMap = EMOCAO_EMOJI;

  constructor(
    private supabase: SupabaseService,
    private groq: GroqService,
    private dashboard: DashboardService,
  ) {
    addIcons({ flameOutline, trendingUpOutline, calendarOutline, sparklesOutline, pencilOutline });
  }

  async ngOnInit() {
    await this.carregar();
  }

  async carregar() {
    this.carregando.set(true);
    try {
      const entradas = await this.supabase.buscarEntradasDashboard();
      this.dados.set(this.dashboard.computar(entradas));
      this.buscarInsight();
    } finally {
      this.carregando.set(false);
    }
  }

  private async buscarInsight() {
    const d = this.dados();
    if (!d?.entradasSemana.length) return;
    this.carregandoInsight.set(true);
    const resultado = await this.groq.gerarInsightSemanal(d.entradasSemana);
    this.insight.set(resultado);
    this.carregandoInsight.set(false);
  }

  // ── SVG linha de tendência ────────────────────────────────────────────────

  private svgCoords(pontos: DiaTendencia[]): { x: number; y: number; i: number }[] {
    const eff = SVG_W - PAD_X * 2;
    return pontos
      .map((p, i) => ({
        x: PAD_X + (i / (pontos.length - 1)) * eff,
        y: p.score !== null ? SVG_H - 4 - ((p.score - 1) / 9) * (SVG_H - 12) : null,
        i,
      }))
      .filter(p => p.y !== null) as { x: number; y: number; i: number }[];
  }

  pathLinha(pontos: DiaTendencia[]): string {
    const coords = this.svgCoords(pontos);
    if (coords.length < 2) return '';
    return coords.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
  }

  pathArea(pontos: DiaTendencia[]): string {
    const linha = this.pathLinha(pontos);
    if (!linha) return '';
    const coords = this.svgCoords(pontos);
    const fx = coords[0].x.toFixed(1);
    const lx = coords[coords.length - 1].x.toFixed(1);
    return `${linha} L ${lx} ${SVG_H} L ${fx} ${SVG_H} Z`;
  }

  pontosLinha(pontos: DiaTendencia[]): { x: number; y: number }[] {
    return this.svgCoords(pontos);
  }

  xPara(i: number, total: number): number {
    return PAD_X + (i / (total - 1)) * (SVG_W - PAD_X * 2);
  }

  // ── Helpers barras 7 dias ─────────────────────────────────────────────────

  corBarra(score: number | null): string {
    if (score === null) return 'vazia';
    return this.dashboard.corBarra(score);
  }

  alturaBarra(score: number | null): number {
    if (!score) return 4;
    return Math.round((score / 10) * 88) + 8;
  }

  emojiPara(emocao: string | null | undefined): string {
    return emocao ? (this.emojiMap[emocao] ?? '✨') : '';
  }

  tamanhoFonte(peso: number): string {
    return `${(peso * 0.9).toFixed(2)}rem`;
  }

  temTendencia(): boolean {
    return this.dados()?.humorTendencia30.some(d => d.score !== null) ?? false;
  }
}
