import { useEffect, useState } from 'react';
import { useModalStore } from '../../state/modalStore';
import { useStore } from '../../state/store';
import { getPublishApiUrl } from '../../publish/getPublishApiUrl';
import { publishToNotion } from '../../publish/publishToNotion';

interface Status {
  text: string;
  cls: '' | 'ok' | 'bad';
  link?: string;
}

export function PlanModal() {
  const { open, target, title, markdown } = useModalStore();
  const close = useModalStore((s) => s.closePlanModal);
  const apiUrl = useStore((s) => s.settings.apiUrl);
  const savePublishResult = useStore((s) => s.savePublishResult);
  // Select stable slices; compute `existing` in render so the selector snapshot
  // stays referentially stable (a selector returning a fresh object loops).
  const months = useStore((s) => s.months);
  const activeMonth = useStore((s) => s.activeMonth);
  const weeklyEntries = useStore((s) => s.weeklyEntries);
  const monthlyEntries = useStore((s) => s.monthlyEntries);
  const existing = (() => {
    if (!target) return { id: '', url: '' };
    if (target.source === 'warplan') {
      const p = months[activeMonth];
      return { id: (p.notionPageId || '').trim(), url: p.notionPageUrl || '' };
    }
    const e = (target.kind === 'weekly' ? weeklyEntries : monthlyEntries)[target.id];
    return { id: (e?.notionPageId || '').trim(), url: e?.notionPageUrl || '' };
  })();

  const [status, setStatus] = useState<Status>({ text: '', cls: '' });
  const [busy, setBusy] = useState(false);
  const [publishedUrl, setPublishedUrl] = useState('');

  useEffect(() => {
    if (open) {
      setStatus(
        existing.id
          ? { text: 'Already published — re-publishing overwrites the existing page.', cls: '' }
          : { text: '', cls: '' },
      );
      setPublishedUrl('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open || !target) return null;

  const hasPrior = !!existing.id || !!publishedUrl;

  async function copyMarkdown() {
    try {
      await navigator.clipboard.writeText(markdown);
      setStatus({ text: 'Copied — paste into your Notion page (cmd+V)', cls: 'ok' });
    } catch {
      const ta = document.createElement('textarea');
      ta.value = markdown;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setStatus({ text: 'Copied (fallback)', cls: 'ok' });
    }
  }

  function openNotion() {
    const url = (publishedUrl || existing.url || '').trim();
    window.open(url || 'https://www.notion.so/', '_blank', 'noopener');
  }

  async function publish() {
    const resolved = getPublishApiUrl(apiUrl);
    if (!resolved) {
      setStatus({ text: 'Publish endpoint not configured. Set it in Settings → Notion API.', cls: 'bad' });
      return;
    }
    setBusy(true);
    setStatus({ text: existing.id ? 'Updating Notion page…' : 'Creating Notion page…', cls: '' });
    try {
      const data = await publishToNotion(resolved, {
        title,
        markdown,
        pageId: existing.id || undefined,
      });
      savePublishResult(target!, data.page_id || '', data.page_url || '');
      setPublishedUrl(data.page_url || '');
      setStatus({
        text: `${data.updated ? 'Updated' : 'Published'} — open in Notion`,
        cls: 'ok',
        link: data.page_url,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setStatus({ text: `Publish failed: ${msg}. (Falling back: copy markdown manually.)`, cls: 'bad' });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="modal-overlay open" onClick={(e) => e.target === e.currentTarget && close()}>
      <div className="modal">
        <div className="modal-head">
          <h2>{title} — markdown</h2>
          <button className="x" onClick={close}>
            ×
          </button>
        </div>
        <div className="modal-body">
          <pre>{markdown}</pre>
        </div>
        <div className="modal-foot">
          <span className={`status ${status.cls}`}>
            {status.link ? (
              <a href={status.link} target="_blank" rel="noopener">
                {status.text}
              </a>
            ) : (
              status.text
            )}
          </span>
          <button className="ghost" onClick={openNotion}>
            Open Notion
          </button>
          <button className="ghost" onClick={copyMarkdown}>
            Copy markdown
          </button>
          <button className="primary" onClick={publish} disabled={busy}>
            {hasPrior ? 'Re-publish to Notion ↻' : 'Publish to Notion →'}
          </button>
        </div>
      </div>
    </div>
  );
}
