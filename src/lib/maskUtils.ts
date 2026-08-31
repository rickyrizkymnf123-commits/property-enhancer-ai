/**
 * Utility functions for masking sensitive credentials and API keys on client side.
 */

/**
 * Masks an API key in standard format: `sk-...ab12` (or `AIz...ab12`).
 * If the key has prefix `sk-`, it preserves `sk-...` followed by the last 4 characters.
 * For keys >= 8 characters, preserves first 3 characters + `...` + last 4 characters.
 * For keys < 8 characters or empty/null, returns `****`.
 */
export function maskApiKey(key: string | null | undefined): string {
  if (!key || typeof key !== 'string') {
    return '****';
  }

  const trimmed = key.trim();
  if (trimmed.length < 8) {
    return '****';
  }

  if (trimmed.startsWith('sk-')) {
    const suffix = trimmed.slice(-4);
    return `sk-...${suffix}`;
  }

  const prefix = trimmed.slice(0, 3);
  const suffix = trimmed.slice(-4);
  return `${prefix}...${suffix}`;
}

/**
 * Formats quota countdown date into human readable Indonesian string.
 * Example: "15 September 2026 (15 hari lagi)"
 */
export function formatCycleResetDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';

  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '—';

    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    const diffDays = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));

    const formattedDate = date.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

    if (diffDays === 0) {
      return `${formattedDate} (Hari ini)`;
    } else if (diffDays === 1) {
      return `${formattedDate} (Besok)`;
    } else {
      return `${formattedDate} (${diffDays} hari lagi)`;
    }
  } catch {
    return dateStr;
  }
}

export function isMaskedKeyString(key: string | null | undefined): boolean {
  if (!key || typeof key !== 'string') return false;
  return key.startsWith('••••') || key.includes('...') || key === '****';
}
