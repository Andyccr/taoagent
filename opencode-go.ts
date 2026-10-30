import type { Model } from './store.ts'

export const GO_MODELS = [
  'glm-5.3-flash', 'glm-5.3', 'glm-5.2', 'kimi-k3', 'kimi-k2.7-code',
  'deepseek-v4.1-flash', 'deepseek-v4-pro', 'mimo-v2.6-flash', 'mimo-v2.6-pro',
  'minimax-m3', 'qwen3.8-max', 'qwen3.8-flash', 'qwen3.7-plus',
  'gpt-6-luna', 'gpt-5.6-luna', 'grok-4.7', 'claude-haiku-5-5', 'gemini-4-argon-contributor',
]
// Official Go documentation, verified 2026-10-20. Users may also enter older model IDs.
export function goProfile(raw: string): { model: string; protocol: Model['protocol']; baseUrl: string } {
  const model = raw.trim().replace(/^opencode-go\//, '')
  const protocol = /^(gpt-|muse-spark-|grok-4\.7)/.test(model) ? 'responses'
    : /^(claude-|minimax-|qwen3\.[678])/.test(model) ? 'anthropic'
    : model.startsWith('gemini-') ? 'gemini' : 'openai'
  const path = protocol === 'anthropic' ? 'anthropic/v1' : protocol === 'gemini' ? 'google/v1beta' : 'openai/v1'
  return { model, protocol, baseUrl: `https://opencode.ai/inference/go/${path}` }
}
export function isGoUrl(value: string): boolean {
  try { const url = new URL(value); return url.origin === 'https://opencode.ai' && /^\/(inference|zen)\/go\//.test(url.pathname) }
  catch { return false }
}
