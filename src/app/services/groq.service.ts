import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';

export interface AnaliseIA {
  humor_score: number;
  emocao: string;
  temas: string[];
}

const PROMPT_SISTEMA = `Você é um analisador empático de diário pessoal. Analise o texto e retorne SOMENTE um objeto JSON válido, sem markdown, sem texto extra.

Formato obrigatório:
{"humor_score": <1-10>, "emocao": "<palavra>", "temas": ["<tema>", ...]}

Regras:
- humor_score: 1 (muito mal) a 10 (excelente)
- emocao: uma palavra em português minúsculo (feliz, animado, grato, tranquilo, ansioso, estressado, cansado, triste, frustrado, entusiasmado, neutro)
- temas: 1 a 3 temas relevantes em português minúsculo (trabalho, família, saúde, sono, relacionamento, finanças, lazer, produtividade, estudos, autocuidado)`;

@Injectable({ providedIn: 'root' })
export class GroqService {
  private readonly url = 'https://api.groq.com/openai/v1/chat/completions';
  private readonly modelo = 'llama-3.1-8b-instant';

  async processarEntrada(texto: string): Promise<AnaliseIA | null> {
    if (!environment.groqKey || environment.groqKey === 'GROQ_KEY_AQUI') return null;

    try {
      const res = await fetch(this.url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${environment.groqKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.modelo,
          messages: [
            { role: 'system', content: PROMPT_SISTEMA },
            { role: 'user', content: texto },
          ],
          temperature: 0.2,
          max_tokens: 120,
          response_format: { type: 'json_object' },
        }),
      });

      if (!res.ok) return null;

      const data = await res.json();
      const raw = data.choices?.[0]?.message?.content?.trim();
      if (!raw) return null;

      const analise: AnaliseIA = JSON.parse(raw);

      if (
        typeof analise.humor_score !== 'number' ||
        analise.humor_score < 1 || analise.humor_score > 10 ||
        typeof analise.emocao !== 'string' ||
        !Array.isArray(analise.temas)
      ) return null;

      analise.emocao = analise.emocao.toLowerCase().trim();
      analise.temas = analise.temas.map((t: string) => t.toLowerCase().trim()).slice(0, 3);

      return analise;
    } catch {
      return null;
    }
  }
}
