import { Component, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import {
  IonContent, IonInput, IonSpinner, IonIcon,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  bookOutline, mailOutline, lockClosedOutline,
  alertCircleOutline, checkmarkCircleOutline,
} from 'ionicons/icons';
import { SupabaseService } from '../../services/supabase.service';

@Component({
  selector: 'app-auth',
  templateUrl: 'auth.page.html',
  styleUrls: ['auth.page.scss'],
  standalone: true,
  imports: [FormsModule, IonContent, IonInput, IonSpinner, IonIcon],
})
export class AuthPage {
  modo = signal<'entrar' | 'cadastrar'>('entrar');
  email = signal('');
  senha = signal('');
  carregando = signal(false);
  erro = signal('');
  sucesso = signal('');

  constructor(private supabase: SupabaseService, private router: Router) {
    addIcons({ bookOutline, mailOutline, lockClosedOutline, alertCircleOutline, checkmarkCircleOutline });
  }

  alternarModo(valor: string) {
    this.modo.set(valor as 'entrar' | 'cadastrar');
    this.erro.set('');
    this.sucesso.set('');
  }

  async submeter() {
    if (!this.email() || !this.senha()) {
      this.erro.set('Preencha todos os campos.');
      return;
    }
    this.carregando.set(true);
    this.erro.set('');
    this.sucesso.set('');

    try {
      if (this.modo() === 'entrar') {
        const { error } = await this.supabase.entrar(this.email(), this.senha());
        if (error) throw error;
        this.router.navigate(['/diario'], { replaceUrl: true });
      } else {
        const { error } = await this.supabase.cadastrar(this.email(), this.senha());
        if (error) throw error;
        this.sucesso.set('Conta criada! Verifique seu e-mail para confirmar.');
      }
    } catch (err: any) {
      this.erro.set(err.message ?? 'Erro desconhecido.');
    } finally {
      this.carregando.set(false);
    }
  }
}
