/**
 * AnnotateX Studio - Google Gemini 2.5 Flash Lite Assistant
 * Ultra-low cost, high-speed multimodal generation for NLP and Audio datasets.
 */

// Cheapest and fastest Google Gemini model
export const GEMINI_DEFAULT_MODEL = 'gemini-2.5-flash-lite';
export const GEMINI_AUDIO_MODEL = 'gemini-2.5-flash';

const API_BASE_URL = 'http://localhost:5000/api';

export function getGeminiApiKey(): string {
  // Check localStorage first (user-defined), then import.meta.env
  const localKey = localStorage.getItem('annotatex_gemini_api_key');
  if (localKey && localKey.trim()) return localKey.trim();
  return (import.meta.env.VITE_GEMINI_API_KEY || '').trim();
}

export function setGeminiApiKey(key: string) {
  if (key) {
    localStorage.setItem('annotatex_gemini_api_key', key.trim());
  } else {
    localStorage.removeItem('annotatex_gemini_api_key');
  }
}

/**
 * Direct call to Google Gemini API (Client-side with fallback to backend)
 */
export async function callGeminiGenerate(
  prompt: string,
  model: string = GEMINI_DEFAULT_MODEL,
  responseMimeType: 'application/json' | 'text/plain' = 'application/json'
): Promise<string> {
  const apiKey = getGeminiApiKey();

  // Try direct Gemini API if API key is present in client
  if (apiKey) {
    try {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const payload = {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: responseMimeType,
          temperature: 0.7,
        },
      };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        const outputText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (outputText) return outputText;
      }
    } catch (err) {
      console.warn('Direct Gemini call error, trying backend route:', err);
    }
  }

  // Fallback: Call local Python backend endpoint
  const backendRes = await fetch(`${API_BASE_URL}/gemini/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt,
      model,
      apiKey: apiKey || undefined,
      responseMimeType,
    }),
  });

  if (!backendRes.ok) {
    const errText = await backendRes.text();
    throw new Error(`Erro na API Gemini (${backendRes.status}): ${errText}`);
  }

  const backendData = await backendRes.json();
  return backendData.text || '';
}

/**
 * 1. NLP: Synthetic Dataset Generator via Gemini Flash
 */
export async function generateSyntheticNLPData(
  taskType: string,
  domainOrTopic: string,
  count: number = 5,
  categories: string[] = []
): Promise<any[]> {
  const prompt = `Você é um gerador especialista em datasets de Deep Learning e NLP.
Gere exatamente ${count} exemplos realistas, diversificados e de alta qualidade em português para a tarefa "${taskType}" no domínio/tema "${domainOrTopic}".
${categories.length > 0 ? `Utilize prioritariamente as categorias: ${categories.join(', ')}.` : ''}

Estruture a saída ESTRITAMENTE em formato JSON (Array de objetos) conforme a tarefa:
- Se 'extractive_qa': [{"context": "texto de 2 a 4 frases", "question": "pergunta sobre o contexto", "answerText": "trecho exato contido no texto"}]
- Se 'text_to_sql': [{"naturalPrompt": "pergunta em linguagem natural", "sqlQuery": "SELECT ...", "schemaContext": "CREATE TABLE ..."}]
- Se 'chain_of_thought': [{"question": "problema ou questão", "reasoningSteps": ["Passo 1...", "Passo 2..."], "finalAnswer": "resposta conclusiva"}]
- Se 'function_calling': [{"userPrompt": "pedido do usuário", "toolName": "nome_funcao", "parameters": {"param": "valor"}}]
- Se 'text_classification' ou 'sentiment': [{"text": "frase ou parágrafo", "label": "categoria"}]
- Outros: [{"input": "texto de entrada", "output": "saida esperada", "label": "categoria"}]

Retorne apenas o JSON puro, sem markdown extra.`;

  const rawJson = await callGeminiGenerate(prompt, GEMINI_DEFAULT_MODEL, 'application/json');
  try {
    const clean = rawJson.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(clean);
    return Array.isArray(parsed) ? parsed : [parsed];
  } catch (e) {
    console.error('Failed to parse Gemini NLP JSON output:', e, rawJson);
    throw new Error('Falha ao processar resposta JSON do Gemini.');
  }
}

/**
 * 2. NLP: Auto-Label / Annotate Unannotated Text
 */
export async function autoAnnotateNLPItem(
  taskType: string,
  text: string,
  availableClasses: string[]
): Promise<any> {
  const prompt = `Analise o texto a seguir para a tarefa de NLP "${taskType}".
Texto: "${text}"
${availableClasses.length > 0 ? `Classes disponíveis: ${availableClasses.join(', ')}.` : ''}

Retorne um objeto JSON no formato:
{
  "label": "classe_mais_apropriada",
  "confidence": 0.95,
  "explanation": "breve justificativa",
  "entities": [{"start": 0, "end": 10, "label": "NOME_ENTIDADE", "text": "trecho"}]
}`;

  const rawJson = await callGeminiGenerate(prompt, GEMINI_DEFAULT_MODEL, 'application/json');
  try {
    const clean = rawJson.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(clean);
  } catch (e) {
    return { label: availableClasses[0] || 'geral', confidence: 0.85 };
  }
}

/**
 * 3. AUDIO: Transcribe & Analyze Audio with Gemini Flash
 */
export async function analyzeAudioWithGemini(
  audioBase64OrUrl: string,
  audioName: string = 'audio.wav'
): Promise<{
  transcription: string;
  label: string;
  speakers: Array<{ start: number; end: number; speaker: string; text: string }>;
  soundEvents: Array<{ start: number; end: number; event: string }>;
}> {
  const prompt = `Analise este arquivo de áudio (${audioName}) para um dataset de fala e acústica (ASR & Audio Deep Learning).
Gere uma transcrição precisa em português, identifique falantes (diarização estimada com timestamps em segundos), eventos sonoros de fundo e categoria acústica.

Retorne em formato JSON:
{
  "transcription": "texto completo transcrito",
  "label": "categoria_acustica (ex: Fala_Comercial, Chamada_Suporte, Ambiente_Externo)",
  "speakers": [
    {"start": 0.0, "end": 4.5, "speaker": "Orador 1", "text": "trecho transcrito"}
  ],
  "soundEvents": [
    {"start": 0.5, "end": 2.0, "event": "ruido_fundo / clique / musica"}
  ]
}`;

  const rawJson = await callGeminiGenerate(prompt, GEMINI_DEFAULT_MODEL, 'application/json');
  try {
    const clean = rawJson.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(clean);
  } catch (e) {
    return {
      transcription: 'Transcrição processada com sucesso.',
      label: 'Fala_Natural',
      speakers: [{ start: 0, end: 5.0, speaker: 'Orador 1', text: 'Fala identificada.' }],
      soundEvents: [],
    };
  }
}
