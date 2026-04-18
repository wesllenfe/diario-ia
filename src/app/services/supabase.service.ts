import { Injectable, signal } from '@angular/core';
import { AuthChangeEvent, createClient, Session, SupabaseClient, User } from '@supabase/supabase-js';
import { environment } from '../../environments/environment';
import { AnaliseIA } from './groq.service';

// NavigatorLocks falha em Ionic/WebView — bypass com execução direta
const noLock = <R>(_name: string, _timeout: number, fn: () => Promise<R>): Promise<R> => fn();

export interface EntradaDiario {
  id: string;
  user_id?: string;
  conteudo: string;
  created_at: string;
  humor_score?: number | null;
  emocao?: string | null;
  temas?: string[] | null;
  processado?: boolean;
}

@Injectable({ providedIn: 'root' })
export class SupabaseService {
  private supabase: SupabaseClient;

  usuario = signal<User | null>(null);

  constructor() {
    this.supabase = createClient(environment.supabaseUrl, environment.supabaseKey, {
      auth: {
        lock: noLock,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
        storage: localStorage,
      },
    });
    this.supabase.auth.getSession().then(({ data }) => {
      this.usuario.set(data.session?.user ?? null);
    });
    this.supabase.auth.onAuthStateChange((_event: AuthChangeEvent, session: Session | null) => {
      this.usuario.set(session?.user ?? null);
    });
  }

  async entrar(email: string, senha: string) {
    return this.supabase.auth.signInWithPassword({ email, password: senha });
  }

  async cadastrar(email: string, senha: string) {
    return this.supabase.auth.signUp({ email, password: senha });
  }

  async sair() {
    return this.supabase.auth.signOut();
  }

  async salvarEntrada(conteudo: string): Promise<string> {
    const user = this.usuario();
    if (!user) throw new Error('Não autenticado');
    const { data, error } = await this.supabase
      .from('entradas')
      .insert({ conteudo, user_id: user.id })
      .select('id')
      .single();
    if (error) throw error;
    return data.id;
  }

  async atualizarAnalise(id: string, analise: AnaliseIA): Promise<void> {
    const { error } = await this.supabase
      .from('entradas')
      .update({
        humor_score: analise.humor_score,
        emocao: analise.emocao,
        temas: analise.temas,
        processado: true,
      })
      .eq('id', id);
    if (error) throw error;
  }

  async buscarEntradas(): Promise<EntradaDiario[]> {
    const { data, error } = await this.supabase
      .from('entradas')
      .select('id, conteudo, created_at, humor_score, emocao, temas, processado')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data ?? []) as EntradaDiario[];
  }
}
