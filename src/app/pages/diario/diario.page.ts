import { Component, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DatePipe, TitleCasePipe } from '@angular/common';
import {
  IonHeader, IonToolbar, IonContent, IonTextarea,
  IonSpinner, IonIcon, IonRefresher, IonRefresherContent,
  ToastController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  logOutOutline, arrowUpOutline, alertCircleOutline,
  pencilOutline, refreshOutline, sparklesOutline,
} from 'ionicons/icons';
import { SupabaseService, EntradaDiario } from '../../services/supabase.service';
import { GroqService } from '../../services/groq.service';

export const EMOCAO_EMOJI: Record<string, string> = {
  feliz: '😊', animado: '🚀', grato: '🙏', tranquilo: '😌',
  entusiasmado: '✨', ansioso: '😰', estressado: '😤',
  cansado: '😴', triste: '😢', frustrado: '😠', neutro: '😐',
};

export const EMOCAO_COR: Record<string, 'positiva' | 'negativa' | 'neutra'> = {
  feliz: 'positiva', animado: 'positiva', grato: 'positiva',
  tranquilo: 'positiva', entusiasmado: 'positiva',
  ansioso: 'negativa', estressado: 'negativa',
  cansado: 'negativa', triste: 'negativa', frustrado: 'negativa',
  neutro: 'neutra',
};

@Component({
  selector: 'app-diario',
  templateUrl: 'diario.page.html',
  styleUrls: ['diario.page.scss'],
  standalone: true,
  imports: [
    FormsModule, DatePipe, TitleCasePipe,
    IonHeader, IonToolbar, IonContent, IonTextarea,
    IonSpinner, IonIcon, IonRefresher, IonRefresherContent,
  ],
})
export class DiarioPage implements OnInit {
  hoje = new Date();
  texto = signal('');
  escrevendo = signal(false);
  entradas = signal<EntradaDiario[]>([]);
  salvando = signal(false);
  carregando = signal(false);
  erro = signal('');

  readonly emojiMap = EMOCAO_EMOJI;
  readonly corMap = EMOCAO_COR;

  constructor(
    private supabase: SupabaseService,
    private groq: GroqService,
    private router: Router,
    private toast: ToastController,
  ) {
    addIcons({ logOutOutline, arrowUpOutline, alertCircleOutline, pencilOutline, refreshOutline, sparklesOutline });
  }

  async ngOnInit() {
    await this.carregarEntradas();
  }

  async carregarEntradas() {
    this.carregando.set(true);
    try {
      this.entradas.set(await this.supabase.buscarEntradas());
    } catch {
      this.erro.set('Erro ao carregar entradas.');
    } finally {
      this.carregando.set(false);
    }
  }

  async refresh(event: CustomEvent) {
    await this.carregarEntradas();
    (event.target as HTMLIonRefresherElement).complete();
  }

  async salvar() {
    const conteudo = this.texto().trim();
    if (!conteudo) return;

    this.salvando.set(true);
    this.erro.set('');

    try {
      const id = await this.supabase.salvarEntrada(conteudo);
      this.texto.set('');
      await this.carregarEntradas();

      // Processar IA em background sem bloquear a UI
      this.processarEmBackground(id, conteudo);
    } catch {
      this.erro.set('Erro ao salvar entrada.');
    } finally {
      this.salvando.set(false);
    }
  }

  private async processarEmBackground(id: string, conteudo: string) {
    const analise = await this.groq.processarEntrada(conteudo);
    if (!analise) return;

    try {
      await this.supabase.atualizarAnalise(id, analise);
      // Atualiza o card na lista sem recarregar tudo
      this.entradas.update(lista =>
        lista.map(e => e.id === id
          ? { ...e, ...analise, processado: true }
          : e
        )
      );
      await this.mostrarToast(analise.emocao, analise.humor_score);
    } catch {
      // Silencioso — IA é best-effort
    }
  }

  private async mostrarToast(emocao: string, score: number) {
    const emoji = this.emojiMap[emocao] ?? '✨';
    const t = await this.toast.create({
      message: `${emoji} IA detectou: ${emocao} · humor ${score}/10`,
      duration: 3000,
      position: 'bottom',
      cssClass: 'toast-ia',
    });
    await t.present();
  }

  emojiPara(emocao: string | null | undefined): string {
    return emocao ? (this.emojiMap[emocao] ?? '✨') : '';
  }

  corPara(emocao: string | null | undefined): string {
    return emocao ? (this.corMap[emocao] ?? 'neutra') : 'neutra';
  }

  async sair() {
    await this.supabase.sair();
    this.router.navigate(['/auth'], { replaceUrl: true });
  }
}
