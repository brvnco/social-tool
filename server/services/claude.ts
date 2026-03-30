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
  { id: 'gpt-4o-mini', label: 'GPT-4o Mini', provider: 'openai', supportsWebSearch: true, costTier: 'low' },
  { id: 'gpt-4o', label: 'GPT-4o', provider: 'openai', supportsWebSearch: true, costTier: 'medium' },
  { id: 'o3-mini', label: 'o3-mini', provider: 'openai', supportsWebSearch: true, costTier: 'medium' },
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

  const today = new Date().toISOString().split('T')[0];

  const prompt = `You are a social media strategist for Delta, an investment portfolio tracker app by eToro.
Today's date: ${today}

Your job: search the web for the biggest financial/investing stories from the PAST 1-2 WEEKS, then propose exactly 3 topic directions for this week's Instagram/LinkedIn carousel post.

## Research guidelines
1. **Search first.** Look up recent financial news, market moves, earnings, macro events, and trending investing topics from the last 7-14 days. Do NOT rely on training data — verify what is actually happening right now.
2. **Relevance to Delta users.** Delta users are retail investors who track stocks, crypto, ETFs, and multi-exchange portfolios. Topics must be things they care about: market moves, portfolio strategy, earnings season, sector rotations, macro events (Fed, inflation, GDP), crypto trends, or investing education tied to current events.
3. **Timeliness is mandatory.** Every topic must have a clear "why now" rooted in something that happened in the last 1-2 weeks (e.g. an earnings report, a Fed decision, a market milestone, a policy change, a sector breakout). Generic evergreen topics are not acceptable.
4. **Variety.** Propose 3 distinct angles — e.g. one macro/market-wide, one sector/stock-specific, one portfolio strategy or crypto angle.

## Context
- Last topic: ${context.last_topic || 'None (first run)'}
- Topics to avoid (already covered recently): ${context.recent_topics.length ? context.recent_topics.join(', ') : 'None'}
- Low saves last week: ${context.low_saves ? 'Yes' : 'No'}
- Low reach last week: ${context.low_reach ? 'Yes' : 'No'}
${context.low_saves ? '- Since saves were low, propose more specific/niche topics with actionable takeaways\n' : ''}${context.low_reach ? '- Since reach was low, propose topics with broader appeal and attention-grabbing hooks\n' : ''}

## Delta features (pick the most relevant per topic)
- **Link**: connecting brokers/exchanges/wallets — for onboarding, consolidation angles
- **Track**: portfolio performance, gains/losses, allocation — PRO: Portfolio Insights (AI diversification analysis)
- **Update**: alerts, earnings calendar — PRO: Why Is It Moving, Insider Trades
- **Discover**: trending assets, curated insights — PRO: Delta AI Summaries

## Output format
For each direction, provide:
- topic: specific topic title (e.g. "Fed Holds Rates Steady — What It Means for Your Portfolio")
- angle: the content angle (e.g. "3 sectors that historically rally after a rate pause")
- why_now: cite the specific recent event/data point that makes this timely
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

    // Add OpenAI web search + force JSON output
    if (config.provider === 'openai') {
      opts.responseFormat = { type: 'json' as const };
      if (config.supportsWebSearch) {
        opts.tools = {
          web_search: openai.tools.webSearch(),
        };
        opts.maxSteps = 5;
      }
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

  // Force JSON output for OpenAI + web search
  if (config.provider === 'openai') {
    buildOpts.responseFormat = { type: 'json' as const };
    if (config.supportsWebSearch) {
      buildOpts.tools = {
        web_search: openai.tools.webSearch(),
      };
      buildOpts.maxSteps = 10;
    }
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
    const streamOpts: any = {
      model: getModelInstance(modelId),
      maxOutputTokens: 4096,
      system: skillMd,
      prompt,
    };
    if (config.provider === 'openai') {
      streamOpts.responseFormat = { type: 'json' as const };
    }
    const text = await callWithRetryStream(
      () => streamText(streamOpts),
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
  const genOpts: any = {
    model: getModelInstance(modelId),
    maxOutputTokens: 4096,
    system: skillMd,
    prompt,
  };
  if (config.provider === 'openai') {
    genOpts.responseFormat = { type: 'json' as const };
  }
  const result = await callWithRetry(async () => generateText(genOpts));

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
  let cleaned = text;
  // Strip citation/source tags from any provider
  cleaned = cleaned.replace(/<cite[^>]*>.*?<\/cite>/gs, '');
  cleaned = cleaned.replace(/<\/?cite[^>]*>/g, '');
  cleaned = cleaned.replace(/<\/?source[^>]*>/g, '');
  cleaned = cleaned.replace(/<\/?search_result[^>]*>/g, '');
  // Strip markdown reference links [1], [2] etc that some models add
  cleaned = cleaned.replace(/\[\d+\]/g, '');
  // Strip markdown links [text](url) → text (OpenAI web search embeds these)
  // Use \n exclusion to prevent matching across lines (which would eat JSON brackets)
  cleaned = cleaned.replace(/\[([^\]\n]{1,200})\]\([^)\n]*\)/g, '$1');
  // Strip raw URLs in parentheses that some models add as citations
  cleaned = cleaned.replace(/\(https?:\/\/[^)\n]+\)/g, '');
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
        return JSON.parse(fixJsonString(candidate));
      } catch {}
    }
  }
  return null;
}

function fixJsonString(json: string): string {
  let fixed = json;
  // Remove trailing commas before } or ]
  fixed = fixed.replace(/,\s*([\]}])/g, '$1');
  // Fix unescaped control characters inside JSON string values
  // and escape inner double quotes that aren't structural
  let result = '';
  let inString = false;
  let escape = false;
  for (let i = 0; i < fixed.length; i++) {
    const ch = fixed[i];
    if (escape) {
      result += ch;
      escape = false;
      continue;
    }
    if (ch === '\\') {
      result += ch;
      escape = true;
      continue;
    }
    if (ch === '"') {
      if (!inString) {
        // Opening quote — entering a string
        inString = true;
        result += ch;
      } else {
        // We're inside a string and hit a quote.
        // Determine if this is the closing quote or an unescaped inner quote.
        // A closing quote is followed by structural JSON: , } ] : or whitespace before those
        const rest = fixed.substring(i + 1).trimStart();
        const nextChar = rest[0];
        if (nextChar === ',' || nextChar === '}' || nextChar === ']' || nextChar === ':' || nextChar === undefined) {
          // Structural — this is the closing quote
          inString = false;
          result += ch;
        } else {
          // Inner quote — escape it
          result += '\\"';
        }
      }
      continue;
    }
    if (inString && ch === '\n') {
      result += '\\n';
      continue;
    }
    if (inString && ch === '\r') {
      result += '\\r';
      continue;
    }
    if (inString && ch === '\t') {
      result += '\\t';
      continue;
    }
    result += ch;
  }
  return result;
}

/**
 * Extract the first balanced JSON object from text by tracking brace depth.
 * This avoids the lastIndexOf('}') trap when models dump extra text after the JSON.
 */
function extractFirstJsonObject(text: string): string | null {
  const start = text.indexOf('{');
  if (start === -1) return null;

  let depth = 0;
  let inStr = false;
  let esc = false;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (esc) { esc = false; continue; }
    if (ch === '\\' && inStr) { esc = true; continue; }
    if (ch === '"') { inStr = !inStr; continue; }
    if (inStr) continue;
    if (ch === '{') depth++;
    if (ch === '}') {
      depth--;
      if (depth === 0) {
        return text.substring(start, i + 1);
      }
    }
  }
  // Unbalanced — fall back to first { to last }
  const lastBrace = text.lastIndexOf('}');
  if (lastBrace > start) return text.substring(start, lastBrace + 1);
  return null;
}

function parseJsonBrief(text: string): any {
  let cleaned = text.trim();
  cleaned = cleaned.replace(/^```(?:json)?\s*\n?/gm, '');
  cleaned = cleaned.replace(/\n?```\s*$/gm, '');
  cleaned = cleaned.trim();

  const candidate = extractFirstJsonObject(cleaned);
  if (!candidate) return null;

  // Try parsing the balanced extraction directly
  try {
    const parsed = JSON.parse(candidate);
    validateBrief(parsed);
    return stripCitationsFromValues(parsed);
  } catch (e) {
    const errMsg = (e as Error).message;
    console.error('JSON parse error:', errMsg);
    const posMatch = errMsg.match(/position (\d+)/);
    if (posMatch) {
      const pos = Number(posMatch[1]);
      console.error('JSON context around error:', JSON.stringify(candidate.substring(Math.max(0, pos - 80), pos + 80)));
    }
    // Try fixing common issues (unescaped quotes, newlines, trailing commas)
    try {
      const fixed = fixJsonString(candidate);
      const parsed = JSON.parse(fixed);
      validateBrief(parsed);
      return stripCitationsFromValues(parsed);
    } catch (e2) {
      console.error('JSON fix attempt also failed:', (e2 as Error).message);
    }
  }

  // Last resort: try first { to last } in case balanced extraction cut short
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    const fallback = cleaned.substring(firstBrace, lastBrace + 1);
    if (fallback !== candidate) {
      try {
        const parsed = JSON.parse(fixJsonString(fallback));
        validateBrief(parsed);
        console.log('Parsed brief via first-to-last fallback');
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

  const candidate = text.substring(startIdx, lastBrace + 1);
  try {
    return JSON.parse(candidate);
  } catch {
    try {
      return JSON.parse(fixJsonString(candidate));
    } catch {
      return null;
    }
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
