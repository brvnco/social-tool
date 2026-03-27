import { generateText, streamText, type TextStreamPart } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { openai } from '@ai-sdk/openai';
import { google } from '@ai-sdk/google';
import fs from 'fs';
import path from 'path';
import { getSetting } from '../db';

// ── Model registry ──

export interface ModelOption {
  id: string;
  label: string;
  provider: 'anthropic' | 'openai' | 'google';
  supportsWebSearch: boolean;
  costTier: 'low' | 'medium' | 'high';
}

export const AVAILABLE_MODELS: ModelOption[] = [
  // Anthropic
  { id: 'claude-haiku-4-5-20251001', label: 'Claude Haiku 4.5', provider: 'anthropic', supportsWebSearch: true, costTier: 'low' },
  { id: 'claude-sonnet-4-6-20250514', label: 'Claude Sonnet 4.6', provider: 'anthropic', supportsWebSearch: true, costTier: 'medium' },
  { id: 'claude-opus-4-0-20250514', label: 'Claude Opus 4', provider: 'anthropic', supportsWebSearch: true, costTier: 'high' },
  // OpenAI
  { id: 'gpt-4o-mini', label: 'GPT-4o Mini', provider: 'openai', supportsWebSearch: false, costTier: 'low' },
  { id: 'gpt-4o', label: 'GPT-4o', provider: 'openai', supportsWebSearch: false, costTier: 'medium' },
  { id: 'o3-mini', label: 'o3-mini', provider: 'openai', supportsWebSearch: false, costTier: 'medium' },
  // Google
  { id: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash', provider: 'google', supportsWebSearch: true, costTier: 'low' },
  { id: 'gemini-2.5-pro-preview-06-05', label: 'Gemini 2.5 Pro', provider: 'google', supportsWebSearch: true, costTier: 'medium' },
];

function getModelInstance(modelId: string) {
  const model = AVAILABLE_MODELS.find(m => m.id === modelId);
  if (!model) throw new Error(`Unknown model: ${modelId}`);

  switch (model.provider) {
    case 'anthropic':
      return anthropic(modelId);
    case 'openai':
      return openai(modelId);
    case 'google':
      return google(modelId);
    default:
      throw new Error(`Unknown provider: ${model.provider}`);
  }
}

function getModelConfig(modelId: string): ModelOption {
  return AVAILABLE_MODELS.find(m => m.id === modelId) || AVAILABLE_MODELS[0];
}

// Get the currently selected model from settings, default to Haiku
function getSelectedModel(phase: 'discover' | 'research' | 'rewrite'): string {
  const setting = getSetting(`model_${phase}`);
  if (setting) return setting;
  // Defaults
  switch (phase) {
    case 'discover': return 'claude-haiku-4-5-20251001';
    case 'research': return 'claude-haiku-4-5-20251001';
    case 'rewrite': return 'claude-haiku-4-5-20251001';
  }
}

function loadSkillMd(): string {
  const skillPath = path.join(process.cwd(), 'server', 'skill.md');
  return fs.readFileSync(skillPath, 'utf-8');
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export interface ResearchContext {
  last_topic: string | null;
  recent_topics: string[];
  low_saves: boolean;
  low_reach: boolean;
  avg_saves: number;
  avg_reach: number;
}

export interface TopicDirection {
  topic: string;
  angle: string;
  why_now: string;
  delta_feature: string;
  hook: string;
  score: number;
}

// ── Phase 1: Propose 3 topic directions ──

export async function proposeDirections(context: ResearchContext): Promise<TopicDirection[]> {
  const modelId = getSelectedModel('discover');
  const config = getModelConfig(modelId);
  console.log(`Phase 1 using model: ${config.label} (${modelId})`);

  const prompt = `You are a social media strategist for Delta, an investment portfolio tracker app by eToro.

Propose exactly 3 topic directions for this week's Instagram/LinkedIn carousel post.

Context:
- Last topic: ${context.last_topic || 'None (first run)'}
- Topics to avoid: ${context.recent_topics.length ? context.recent_topics.join(', ') : 'None'}
- Low saves last week: ${context.low_saves ? 'Yes' : 'No'}
- Low reach last week: ${context.low_reach ? 'Yes' : 'No'}
${context.low_saves ? '- Since saves were low, propose more specific/niche topics\n' : ''}${context.low_reach ? '- Since reach was low, propose topics with broader appeal\n' : ''}

For each direction, provide:
- topic: the topic (e.g. "Dividend Aristocrats in 2025")
- angle: the content angle (e.g. "5 stocks that raised dividends for 25+ years")
- why_now: why this is timely
- delta_feature: which Delta feature to highlight (Link, Track, Update, or Discover)
- hook: a punchy slide 1 headline (max 8 words)
- score: your confidence score 1-5

Return ONLY a JSON array of 3 objects. No other text, no markdown fences.`;

  // Build tools array — add web search if supported
  const tools: Record<string, any> = {};
  if (config.supportsWebSearch && config.provider === 'anthropic') {
    // Anthropic web search is a special tool type — pass it via provider options
  }

  const result = await callWithRetry(async () => {
    const opts: any = {
      model: getModelInstance(modelId),
      maxOutputTokens: 1024,
      prompt,
    };

    // Add web search for Anthropic models
    if (config.supportsWebSearch && config.provider === 'anthropic') {
      opts.tools = {
        web_search: anthropic.tools.webSearch_20250305(),
      };
      opts.maxSteps = 5;
    }

    // Add Google search grounding for Gemini
    if (config.supportsWebSearch && config.provider === 'google') {
      opts.tools = {
        google_search: google.tools.googleSearch({}),
      };
      opts.maxSteps = 5;
    }

    return generateText(opts);
  });

  const text = cleanText(result.text);
  console.log('Phase 1 raw text:', text.substring(0, 500));

  const parsed = parseJsonArray(text);
  if (!parsed || parsed.length === 0) {
    console.error('Phase 1 parse failed. Full text:', text);
    throw new Error('Failed to parse topic directions');
  }

  return parsed;
}

// ── Phase 2: Build full brief for chosen topic (streaming) ──

export async function buildBrief(
  direction: TopicDirection,
  context: ResearchContext,
  sendEvent: (data: any) => void
): Promise<any> {
  const modelId = getSelectedModel('research');
  const config = getModelConfig(modelId);
  const skillMd = loadSkillMd();

  console.log(`Phase 2 using model: ${config.label} (${modelId})`);
  sendEvent({ type: 'status', message: `Using ${config.label} for research...` });

  const prompt = `Create a complete carousel brief for this topic:

Topic: ${direction.topic}
Angle: ${direction.angle}
Why now: ${direction.why_now}
Delta feature: ${direction.delta_feature}
Hook: ${direction.hook}

Do web searches to gather current data and insights about this topic, then produce the full brief.

Context:
- Low saves last week: ${context.low_saves ? 'Yes — make content more specific and deep' : 'No'}
- Low reach last week: ${context.low_reach ? 'Yes — use a broader, more attention-grabbing hook' : 'No'}

Return ONLY the JSON brief object as specified in your instructions. No other text, no markdown fences.`;

  sendEvent({ type: 'status', message: `Researching "${direction.topic}"...` });

  const buildOpts: any = {
    model: getModelInstance(modelId),
    maxOutputTokens: 4096,
    system: skillMd,
    prompt,
  };

  if (config.supportsWebSearch && config.provider === 'anthropic') {
    buildOpts.tools = {
      web_search: anthropic.tools.webSearch_20250305(),
    };
    buildOpts.maxSteps = 10;
  }

  if (config.supportsWebSearch && config.provider === 'google') {
    buildOpts.tools = {
      google_search: google.tools.googleSearch({}),
    };
    buildOpts.maxSteps = 10;
  }

  const result = await callWithRetryStream(
    () => streamText(buildOpts),
    sendEvent
  );

  const text = cleanText(result);
  console.log('Phase 2 text length:', text.length);

  const brief = parseJsonBrief(text);
  if (!brief) {
    const lastObj = extractLastJsonObject(text);
    if (lastObj && (lastObj.topic || lastObj.slides)) {
      console.log('Parsed brief via last-object fallback');
      sendEvent({ type: 'brief', data: lastObj });
      return stripCitationsFromValues(lastObj);
    }
    console.error('Phase 2 parse failed completely. Text length:', text.length);
    throw new Error('Failed to parse brief JSON from Claude response');
  }

  sendEvent({ type: 'brief', data: brief });
  return brief;
}

// ── Rewrite (streaming) ──

export async function rewriteBrief(
  currentBrief: any,
  feedback: string,
  sendEvent?: (data: any) => void
): Promise<any> {
  const modelId = getSelectedModel('rewrite');
  const config = getModelConfig(modelId);
  const skillMd = loadSkillMd();

  console.log(`Rewrite using model: ${config.label} (${modelId})`);
  sendEvent?.({ type: 'status', message: `Rewriting with ${config.label}...` });

  const prompt = `Here is the current brief that needs revision:

${JSON.stringify(currentBrief, null, 2)}

User feedback:
${feedback}

Revise the brief based on this feedback. Return ONLY the complete updated JSON brief object. No other text, no markdown fences.`;

  if (sendEvent) {
    // Streaming path
    const text = await callWithRetryStream(
      () => streamText({
        model: getModelInstance(modelId),
        maxOutputTokens: 4096,
        system: skillMd,
        prompt,
      }),
      sendEvent
    );

    const cleaned = cleanText(text);
    const brief = parseJsonBrief(cleaned);
    if (!brief) {
      console.error('Rewrite parse failed. Text:', cleaned.substring(0, 500));
      throw new Error('Failed to parse rewritten brief');
    }
    sendEvent({ type: 'brief', data: brief });
    return brief;
  }

  // Non-streaming fallback
  const result = await callWithRetry(async () =>
    generateText({
      model: getModelInstance(modelId),
      maxOutputTokens: 4096,
      system: skillMd,
      prompt,
    })
  );

  const text = cleanText(result.text);
  const brief = parseJsonBrief(text);
  if (!brief) {
    console.error('Rewrite parse failed. Text:', text.substring(0, 500));
    throw new Error('Failed to parse rewritten brief');
  }
  return brief;
}

// ── Helpers ──

function cleanText(text: string): string {
  // Strip citation/source tags from any provider
  let cleaned = text;
  cleaned = cleaned.replace(/<cite[^>]*>.*?<\/cite>/gs, '');
  cleaned = cleaned.replace(/<\/?cite[^>]*>/g, '');
  cleaned = cleaned.replace(/<\/?source[^>]*>/g, '');
  cleaned = cleaned.replace(/<\/?search_result[^>]*>/g, '');
  // Strip markdown reference links [1], [2] etc that some models add
  cleaned = cleaned.replace(/\[\d+\]/g, '');
  return cleaned;
}

/**
 * Stream-aware retry wrapper. Calls streamText, consumes the stream,
 * emits real-time events (text deltas, tool calls), and returns the full text.
 */
async function callWithRetryStream(
  fn: () => ReturnType<typeof streamText>,
  sendEvent: (data: any) => void,
  maxAttempts = 5,
): Promise<string> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const stream = fn();
      let fullText = '';

      for await (const part of stream.fullStream) {
        switch (part.type) {
          case 'text-delta':
            fullText += part.text;
            sendEvent({ type: 'text-delta', delta: part.text });
            break;
          case 'tool-call':
            sendEvent({
              type: 'search',
              query: (part as any).input?.query || part.toolName,
            });
            break;
          case 'tool-result':
            sendEvent({ type: 'status', message: 'Thinking...' });
            break;
        }
      }

      return fullText;
    } catch (err: any) {
      const status = err?.status || err?.statusCode || (err?.message?.includes('429') ? 429 : 0);
      if (status === 429 && attempt < maxAttempts - 1) {
        const retryAfter = err?.headers?.['retry-after'];
        const waitSec = retryAfter ? Math.ceil(Number(retryAfter)) + 5 : 65;
        console.log(`Rate limited (attempt ${attempt + 1}/${maxAttempts}). Waiting ${waitSec}s...`);
        sendEvent({ type: 'status', message: `Rate limited. Retrying in ${waitSec}s...` });
        await sleep(waitSec * 1000);
        continue;
      }
      throw err;
    }
  }
  throw new Error('Max retries exceeded');
}

async function callWithRetry<T>(fn: () => Promise<T>, maxAttempts = 5): Promise<T> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err: any) {
      const status = err?.status || err?.statusCode || (err?.message?.includes('429') ? 429 : 0);
      if (status === 429 && attempt < maxAttempts - 1) {
        const retryAfter = err?.headers?.['retry-after'];
        const waitSec = retryAfter ? Math.ceil(Number(retryAfter)) + 5 : 65;
        console.log(`Rate limited (attempt ${attempt + 1}/${maxAttempts}). Waiting ${waitSec}s...`);
        await sleep(waitSec * 1000);
        continue;
      }
      throw err;
    }
  }
  throw new Error('Max retries exceeded');
}

function parseJsonArray(text: string): any[] | null {
  let cleaned = text.trim();
  cleaned = cleaned.replace(/^```(?:json)?\s*\n?/gm, '');
  cleaned = cleaned.replace(/\n?```\s*$/gm, '');
  cleaned = cleaned.trim();

  const firstBracket = cleaned.indexOf('[');
  const lastBracket = cleaned.lastIndexOf(']');
  if (firstBracket !== -1 && lastBracket > firstBracket) {
    const candidate = cleaned.substring(firstBracket, lastBracket + 1);
    try {
      return JSON.parse(candidate);
    } catch {
      try {
        return JSON.parse(candidate.replace(/,\s*([\]}])/g, '$1'));
      } catch {}
    }
  }
  return null;
}

function parseJsonBrief(text: string): any {
  let cleaned = text.trim();
  cleaned = cleaned.replace(/^```(?:json)?\s*\n?/gm, '');
  cleaned = cleaned.replace(/\n?```\s*$/gm, '');
  cleaned = cleaned.trim();

  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    const candidate = cleaned.substring(firstBrace, lastBrace + 1);
    try {
      const parsed = JSON.parse(candidate);
      validateBrief(parsed);
      return stripCitationsFromValues(parsed);
    } catch (e) {
      console.error('JSON parse error:', (e as Error).message);
      try {
        const fixed = candidate.replace(/,\s*([\]}])/g, '$1');
        const parsed = JSON.parse(fixed);
        validateBrief(parsed);
        return stripCitationsFromValues(parsed);
      } catch {}
    }
  }
  return null;
}

function extractLastJsonObject(text: string): any | null {
  const lastBrace = text.lastIndexOf('}');
  if (lastBrace <= 0) return null;

  let depth = 0;
  let startIdx = -1;
  for (let i = lastBrace; i >= 0; i--) {
    if (text[i] === '}') depth++;
    if (text[i] === '{') depth--;
    if (depth === 0) { startIdx = i; break; }
  }
  if (startIdx < 0) return null;

  try {
    return JSON.parse(text.substring(startIdx, lastBrace + 1));
  } catch {
    return null;
  }
}

function stripCitationsFromValues(obj: any): any {
  if (typeof obj === 'string') {
    return obj
      .replace(/<cite[^>]*>.*?<\/cite>/gs, '')
      .replace(/<\/?cite[^>]*>/g, '')
      .replace(/<\/?source[^>]*>/g, '')
      .replace(/\[\d+\]/g, '')
      .replace(/\s{2,}/g, ' ')
      .trim();
  }
  if (Array.isArray(obj)) {
    return obj.map(stripCitationsFromValues);
  }
  if (obj && typeof obj === 'object') {
    const cleaned: any = {};
    for (const [k, v] of Object.entries(obj)) {
      cleaned[k] = stripCitationsFromValues(v);
    }
    return cleaned;
  }
  return obj;
}

function validateBrief(brief: any) {
  if (!brief.topic) {
    throw new Error('Brief missing required key: topic');
  }
  if (!Array.isArray(brief.slides) || brief.slides.length < 4) {
    throw new Error(`Brief has ${brief.slides?.length ?? 0} slides, expected 6`);
  }
  const desired = ['cta', 'instagram_caption', 'linkedin_caption', 'x_caption'];
  for (const key of desired) {
    if (!(key in brief)) {
      console.warn(`Brief missing optional key: ${key} — will use fallback`);
    }
  }
}
