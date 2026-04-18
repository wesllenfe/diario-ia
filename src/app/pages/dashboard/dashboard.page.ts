import { Component, OnInit, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import {
  IonHeader, IonToolbar, IonContent, IonIcon, IonSpinner,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  flameOutline, trendingUpOutline, calendarOutline,
  sparklesOutline, happyOutline, pencilOutline,
} from 'ionicons/icons';
import { SupabaseService } from '../../services/supabase.service';
import { GroqService } from '../../services/groq.service';
import { DashboardService, DashboardData } from '../../services/dashboard.service';
import { BottomNavComponent } from '../../components/bottom-nav.component';
import { EMOCAO_EMOJI } from '../diario/diario.page';

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
    addIcons({ flameOutline, trendingUpOutline, calendarOutline, sparklesOutline, happyOutline, pencilOutline });
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

  corBarra(score: number | null): string {
    if (score === null) return 'vazia';
    return this.dashboard.corBarra(score);
  }

  alturaBarra(score: number | null): number {
    if (!score) return 4;
    return Math.round((score / 10) * 88) + 8; // 8–96px
  }

  emojiPara(emocao: string | null | undefined): string {
    return emocao ? (this.emojiMap[emocao] ?? '✨') : '';
  }

  tamanhoFonte(peso: number): string {
    return `${(peso * 0.9).toFixed(2)}rem`;
  }
}
