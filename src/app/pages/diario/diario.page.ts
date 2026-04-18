import { Component, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DatePipe, TitleCasePipe } from '@angular/common';
import {
  IonHeader, IonToolbar, IonContent, IonTextarea,
  IonSpinner, IonIcon, IonRefresher, IonRefresherContent,
  IonItemSliding, IonItem, IonItemOptions, IonItemOption,
  AlertController, ToastController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  logOutOutline, arrowUpOutline, alertCircleOutline,
  pencilOutline, trashOutline,
} from 'ionicons/icons';
import { SupabaseService, EntradaDiario } from '../../services/supabase.service';
import { GroqService } from '../../services/groq.service';
import { BottomNavComponent } from '../../components/bottom-nav.component';

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
    IonItemSliding, IonItem, IonItemOptions, IonItemOption,
    BottomNavComponent,
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
  removendo = signal(new Set<string>());

  readonly emojiMap = EMOCAO_EMOJI;
  readonly corMap = EMOCAO_COR;

  constructor(
    private supabase: SupabaseService,
    private groq: GroqService,
    private router: Router,
    private alert: AlertController,
    private toast: ToastController,
  ) {
    addIcons({ logOutOutline, arrowUpOutline, alertCircleOutline, pencilOutline, trashOutline });
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
      this.processarEmBackground(id, conteudo);
    } catch {
      this.erro.set('Erro ao salvar entrada.');
    } finally {
      this.salvando.set(false);
    }
  }

  async confirmarDelete(entrada: EntradaDiario, sliding: IonItemSliding) {
    await sliding.close();

    const alerta = await this.alert.create({
      header: 'Remover entrada',
      message: 'Essa ação não pode ser desfeita.',
      cssClass: 'alert-delete',
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Remover',
          role: 'destructive',
          cssClass: 'btn-remover',
          handler: () => this.executarDelete(entrada.id),
        },
      ],
    });
    await alerta.present();
  }

  private async executarDelete(id: string) {
    // Marca como removendo para disparar a animação
    this.removendo.update(s => new Set(s).add(id));

    // Aguarda a animação (300ms) antes de remover do DOM e do banco
    await new Promise(r => setTimeout(r, 300));

    try {
      await this.supabase.deletarEntrada(id);
      this.entradas.update(lista => lista.filter(e => e.id !== id));
      this.removendo.update(s => { const n = new Set(s); n.delete(id); return n; });
      await this.mostrarToast('🗑️ Entrada removida', 'toast-neutro');
    } catch {
      // Reverte a animação se falhar
      this.removendo.update(s => { const n = new Set(s); n.delete(id); return n; });
      await this.mostrarToast('Erro ao remover entrada', 'toast-erro');
    }
  }

  private async processarEmBackground(id: string, conteudo: string) {
    const analise = await this.groq.processarEntrada(conteudo);
    if (!analise) return;
    try {
      await this.supabase.atualizarAnalise(id, analise);
      this.entradas.update(lista =>
        lista.map(e => e.id === id ? { ...e, ...analise, processado: true } : e)
      );
      const emoji = this.emojiMap[analise.emocao] ?? '✨';
      await this.mostrarToast(`${emoji} IA detectou: ${analise.emocao} · humor ${analise.humor_score}/10`, 'toast-ia');
    } catch { /* silencioso */ }
  }

  private async mostrarToast(message: string, cssClass: string) {
    const t = await this.toast.create({ message, duration: 3000, position: 'bottom', cssClass });
    await t.present();
  }

  estaRemovendo(id: string): boolean {
    return this.removendo().has(id);
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
