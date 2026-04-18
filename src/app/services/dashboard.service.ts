import { Injectable } from '@angular/core';
import { EntradaDiario } from './supabase.service';

export interface DiaHumor {
  label: string;
  score: number | null;
  temEntrada: boolean;
}

export interface TemaFreq {
  tema: string;
  contagem: number;
  peso: number; // 0.6 – 1.4 para font-size relativo (em)
}

export interface DiaTendencia {
  score: number | null;
  label: string;   // "1", "2", … ou "1 abr"
  mostrarLabel: boolean;
}

export interface DashboardData {
  streak: number;
  humorMedio7Dias: number | null;
  totalMes: number;
  humorPorDia: DiaHumor[];
  humorTendencia30: DiaTendencia[];
  temas: TemaFreq[];
  emocaoPredominante: string | null;
  corEmocao: 'positiva' | 'negativa' | 'neutra';
  entradasSemana: EntradaDiario[];
  temDadosSuficientes: boolean;
}

const DIAS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const POSITIVAS = new Set(['feliz', 'animado', 'grato', 'tranquilo', 'entusiasmado']);
const NEGATIVAS = new Set(['ansioso', 'estressado', 'cansado', 'triste', 'frustrado']);

@Injectable({ providedIn: 'root' })
export class DashboardService {

  computar(entradas: EntradaDiario[]): DashboardData {
    const agora = new Date();
    const diaDe = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

    // Agrupar por dia
    const porDia = new Map<number, EntradaDiario[]>();
    for (const e of entradas) {
      const k = diaDe(new Date(e.created_at));
      if (!porDia.has(k)) porDia.set(k, []);
      porDia.get(k)!.push(e);
    }

    // Streak
    let streak = 0;
    for (let i = 0; i < 365; i++) {
      const k = diaDe(new Date(agora.getTime() - i * 86_400_000));
      if (porDia.has(k)) streak++;
      else if (i > 0) break;
    }

    // Humor por dia — últimos 7
    const humorPorDia: DiaHumor[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(agora.getTime() - i * 86_400_000);
      const lista = porDia.get(diaDe(d)) ?? [];
      const comScore = lista.filter(e => e.humor_score != null);
      const score = comScore.length > 0
        ? comScore.reduce((s, e) => s + e.humor_score!, 0) / comScore.length
        : null;
      humorPorDia.push({ label: DIAS[d.getDay()], score, temEntrada: lista.length > 0 });
    }

    // Humor médio 7 dias
    const scores7 = humorPorDia.filter(d => d.score != null).map(d => d.score!);
    const humorMedio7Dias = scores7.length > 0
      ? Math.round((scores7.reduce((a, b) => a + b, 0) / scores7.length) * 10) / 10
      : null;

    // Total do mês
    const inicioMes = new Date(agora.getFullYear(), agora.getMonth(), 1);
    const totalMes = entradas.filter(e => new Date(e.created_at) >= inicioMes).length;

    // Temas recorrentes
    const processadas = entradas.filter(e => e.processado && e.temas?.length);
    const contagemTemas = new Map<string, number>();
    for (const e of processadas) {
      for (const t of e.temas!) contagemTemas.set(t, (contagemTemas.get(t) ?? 0) + 1);
    }
    const maxT = Math.max(...contagemTemas.values(), 1);
    const temas: TemaFreq[] = [...contagemTemas.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12)
      .map(([tema, contagem]) => ({ tema, contagem, peso: 0.75 + (contagem / maxT) * 0.65 }));

    // Emoção predominante (últimos 7 dias)
    const inicio7 = new Date(agora.getTime() - 7 * 86_400_000);
    const entradasSemana = entradas.filter(e =>
      e.processado && new Date(e.created_at) >= inicio7
    );
    const contagemEmocoes = new Map<string, number>();
    for (const e of entradasSemana) {
      if (e.emocao) contagemEmocoes.set(e.emocao, (contagemEmocoes.get(e.emocao) ?? 0) + 1);
    }
    const emocaoPredominante = contagemEmocoes.size > 0
      ? [...contagemEmocoes.entries()].sort((a, b) => b[1] - a[1])[0][0]
      : null;

    const corEmocao: 'positiva' | 'negativa' | 'neutra' = emocaoPredominante
      ? POSITIVAS.has(emocaoPredominante) ? 'positiva'
        : NEGATIVAS.has(emocaoPredominante) ? 'negativa' : 'neutra'
      : 'neutra';

    // Tendência 30 dias
    const humorTendencia30: DiaTendencia[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(agora.getTime() - i * 86_400_000);
      const lista = porDia.get(diaDe(d)) ?? [];
      const comScore = lista.filter(e => e.humor_score != null);
      const score = comScore.length > 0
        ? comScore.reduce((s, e) => s + e.humor_score!, 0) / comScore.length
        : null;
      const mostrarLabel = d.getDate() === 1 || i === 29 || i === 0 || i === 14;
      const label = mostrarLabel
        ? d.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })
        : '';
      humorTendencia30.push({ score, label, mostrarLabel });
    }

    return {
      streak,
      humorMedio7Dias,
      totalMes,
      humorPorDia,
      humorTendencia30,
      temas,
      emocaoPredominante,
      corEmocao,
      entradasSemana,
      temDadosSuficientes: entradas.length >= 1,
    };
  }

  corBarra(score: number): string {
    if (score >= 7) return 'alta';
    if (score >= 4) return 'media';
    return 'baixa';
  }
}
