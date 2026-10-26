import DOMPurify from 'dompurify';

const HTML_TAG_RE = /<\/?(p|br|strong|em|u|s|ul|ol|li|a|h[1-6]|blockquote|code|pre)\b[^>]*>/i;

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Erkennt, ob ein gespeicherter Notiztext bereits HTML aus dem Editor ist. */
export function isHtml(value: string | null | undefined): boolean {
  return Boolean(value && HTML_TAG_RE.test(value));
}

/** Alte Klartext-Notizen in HTML umwandeln, damit der Editor sie korrekt anzeigt. */
export function toEditorHtml(value: string | null | undefined): string {
  if (!value) return '';
  if (isHtml(value)) return value;
  return value
    .split(/\n{2,}/)
    .map((para) => `<p>${escapeHtml(para).replace(/\n/g, '<br>')}</p>`)
    .join('');
}

/** HTML säubern, bevor es mit dangerouslySetInnerHTML angezeigt wird. */
export function sanitizeHtml(value: string | null | undefined): string {
  return DOMPurify.sanitize(toEditorHtml(value), {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'b', 'em', 'i', 'u', 's', 'ul', 'ol', 'li', 'a', 'h2', 'h3', 'blockquote'],
    ALLOWED_ATTR: ['href', 'target', 'rel'],
  });
}

/** HTML in Klartext umwandeln (für ICS, Outlook, Exporte). */
export function htmlToPlainText(value: string | null | undefined): string {
  if (!value) return '';
  if (!isHtml(value)) return value;
  const withBreaks = value
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<li[^>]*>/gi, '• ')
    .replace(/<\/(p|li|h[1-6]|blockquote)>/gi, '\n');
  const doc = new DOMParser().parseFromString(withBreaks, 'text/html');
  return (doc.body.textContent || '').replace(/\n{3,}/g, '\n\n').trim();
}

/** Leerer Editor-Inhalt ("<p></p>") zählt als leer. */
export function normalizeNotes(value: string): string {
  return htmlToPlainText(value).trim() ? value.trim() : '';
}
