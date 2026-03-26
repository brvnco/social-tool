import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs';
import path from 'path';

let _client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!_client) {
    _client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return _client;
}

function loadSkillMd(): string {
  const skillPath = path.join(process.cwd(), 'server', 'skill.md');
  return fs.readFileSync(skillPath, 'utf-8');
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

const MODEL = 'claude-haiku-4-5-20251001';

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

// ── Phase 1: Propose 3 topic directions (no web search, cheap) ──

export async function proposeDirections(context: ResearchContext): Promise<TopicDirection[]> {
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

  const response = await callWithRetry(() =>
    getClient().messages.create({
      model: MODEL,
      max_tokens: 1024,
      tools: [{ type: 'web_search_20250305' as any, name: 'web_search' }],
      messages: [{ role: 'user', content: prompt }],
    })
  );

  const text = extractText(response);
  console.log('Phase 1 raw text:', text.substring(0, 300));

  const parsed = parseJsonArray(text);
  if (!parsed || parsed.length === 0) {
    console.error('Phase 1 parse failed. Full text:', text);
    throw new Error('Failed to parse topic directions from Claude');
  }

  return parsed;
}

// ── Phase 2: Build full brief for chosen topic (with web search) ──

export async function buildBrief(
  direction: TopicDirection,
  context: ResearchContext,
  sendEvent: (data: any) => void
): Promise<any> {
  const skillMd = loadSkillMd();

  const prompt = `Create a complete carousel brief for this topic:

Topic: ${direction.topic}
Angle: ${direction.angle}
Why now: ${direction.why_now}
Delta feature: ${direction.delta_feature}
Hook: ${direction.hook}

Do a web search to gather current data and insights about this topic, then produce the full brief.

Context:
- Low saves last week: ${context.low_saves ? 'Yes — make content more specific and deep' : 'No'}
- Low reach last week: ${context.low_reach ? 'Yes — use a broader, more attention-grabbing hook' : 'No'}

Return ONLY the JSON brief object as specified in your instructions. No other text, no markdown fences.`;

  sendEvent({ type: 'status', message: `Researching "${direction.topic}"...` });

  // Multi-turn loop: keep going until Claude returns end_turn (not tool_use)
  let messages: any[] = [{ role: 'user', content: prompt }];
  let allText = '';
  let maxTurns = 8; // safety limit

  for (let turn = 0; turn < maxTurns; turn++) {
    const response = await callWithRetry(() =>
      getClient().messages.create({
        model: MODEL,
        max_tokens: 4096,
        system: skillMd,
        tools: [{ type: 'web_search_20250305' as any, name: 'web_search' }],
        messages,
      })
    );

    const blockTypes = response.content.map((b: any) => `${b.type}${(b as any).name ? ':' + (b as any).name : ''}`);
    console.log(`Phase 2 turn ${turn + 1}: blocks=${blockTypes.join(',')} stop=${response.stop_reason}`);

    // Emit search events for this turn
    for (const block of response.content) {
      if (block.type === 'tool_use' && block.name === 'web_search') {
        sendEvent({ type: 'search', query: (block.input as any)?.query || 'web search' });
      }
    }

    // Collect text from this turn
    const turnText = extractText(response);
    allText += turnText;

    // If Claude is done, break
    if (response.stop_reason === 'end_turn') {
      console.log(`Phase 2 complete after ${turn + 1} turns. Total text: ${allText.length} chars`);
      break;
    }

    // If Claude wants to use a tool, we need to continue the conversation
    // Add the assistant's response and a tool result to continue
    messages.push({ role: 'assistant', content: response.content });

    // Build tool results for any tool_use blocks
    const toolResults: any[] = [];
    for (const block of response.content) {
      if (block.type === 'tool_use') {
        // For server-side web_search, the API handles it automatically
        // but if we get here, we need to provide a placeholder result
        toolResults.push({
          type: 'tool_result',
          tool_use_id: block.id,
          content: 'Search completed. Please continue with the brief.',
        });
      }
    }

    if (toolResults.length > 0) {
      messages.push({ role: 'user', content: toolResults });
      sendEvent({ type: 'status', message: `Processing search results (turn ${turn + 2})...` });
    } else {
      // No tool use but also not end_turn — unusual, break to avoid infinite loop
      console.warn('Unexpected stop_reason:', response.stop_reason);
      break;
    }
  }

  if (allText.length === 0) {
    throw new Error('Claude returned no text content after all turns. Try again.');
  }

  const brief = parseJsonBrief(allText);
  if (!brief) {
    console.error('Phase 2 parse failed. Text (first 1000 chars):', allText.substring(0, 1000));
    throw new Error('Failed to parse brief JSON from Claude response');
  }

  sendEvent({ type: 'brief', data: brief });
  return brief;
}

// ── Rewrite ──

export async function rewriteBrief(currentBrief: any, feedback: string): Promise<any> {
  const skillMd = loadSkillMd();

  const prompt = `Here is the current brief that needs revision:

${JSON.stringify(currentBrief, null, 2)}

User feedback:
${feedback}

Revise the brief based on this feedback. Return ONLY the complete updated JSON brief object. No other text, no markdown fences.`;

  const response = await callWithRetry(() =>
    getClient().messages.create({
      model: MODEL,
      max_tokens: 4096,
      system: skillMd,
      messages: [{ role: 'user', content: prompt }],
    })
  );

  const text = extractText(response);
  const brief = parseJsonBrief(text);
  if (!brief) {
    console.error('Rewrite parse failed. Text:', text.substring(0, 500));
    throw new Error('Failed to parse rewritten brief');
  }
  return brief;
}

// ── Helpers ──

function extractText(response: any): string {
  let text = '';
  for (const block of response.content) {
    if (block.type === 'text') {
      text += block.text;
    }
  }
  // Strip citation tags that Claude adds from web search results
  text = text.replace(/<cite[^>]*>.*?<\/cite>/gs, '');
  text = text.replace(/<\/?cite[^>]*>/g, '');
  // Strip any remaining XML-like tags
  text = text.replace(/<\/?source[^>]*>/g, '');
  text = text.replace(/<\/?search_result[^>]*>/g, '');
  return text;
}

async function callWithRetry<T>(fn: () => Promise<T>, maxAttempts = 5): Promise<T> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err: any) {
      if (err?.status === 429 && attempt < maxAttempts - 1) {
        // Parse retry-after header if available, otherwise wait 60s+
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

function stripCitationsFromValues(obj: any): any {
  if (typeof obj === 'string') {
    return obj
      .replace(/<cite[^>]*>.*?<\/cite>/gs, '')
      .replace(/<\/?cite[^>]*>/g, '')
      .replace(/<\/?source[^>]*>/g, '')
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
  const required = ['topic', 'cta', 'slides', 'instagram_caption', 'linkedin_caption', 'x_caption'];
  for (const key of required) {
    if (!(key in brief)) {
      throw new Error(`Brief missing required key: ${key}`);
    }
  }
  if (!Array.isArray(brief.slides) || brief.slides.length < 5 || brief.slides.length > 7) {
    throw new Error(`Brief has ${brief.slides?.length} slides, expected 6`);
  }
}
