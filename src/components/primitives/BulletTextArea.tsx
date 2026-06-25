import { useRef } from 'react';

interface Props {
  value: string;
  placeholder?: string;
  onChange: (value: string) => void;
}

/**
 * Notion-style bullet textarea: typing "- " / "* " at line start becomes "• ",
 * Enter continues the bullet, Enter on an empty bullet exits it. The "•" form is
 * stored; serialize back to "- " when exporting to markdown.
 */
export function BulletTextArea({ value, placeholder, onChange }: Props) {
  const ref = useRef<HTMLTextAreaElement>(null);

  function setCaret(pos: number) {
    requestAnimationFrame(() => {
      const el = ref.current;
      if (el) el.selectionStart = el.selectionEnd = pos;
    });
  }

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const el = e.target;
    const caret = el.selectionStart;
    const v = el.value;
    const lineStart = v.lastIndexOf('\n', caret - 1) + 1;
    const line = v.slice(lineStart, caret);
    if (line === '- ' || line === '* ') {
      const nv = v.slice(0, lineStart) + '• ' + v.slice(caret);
      onChange(nv);
      setCaret(lineStart + 2);
      return;
    }
    onChange(v);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key !== 'Enter' || e.shiftKey) return;
    const el = e.currentTarget;
    const caret = el.selectionStart;
    const v = el.value;
    const lineStart = v.lastIndexOf('\n', caret - 1) + 1;
    const line = v.slice(lineStart, caret);
    if (line === '• ') {
      e.preventDefault();
      const nv = v.slice(0, lineStart) + v.slice(caret);
      onChange(nv);
      setCaret(lineStart);
    } else if (line.startsWith('• ')) {
      e.preventDefault();
      const insert = '\n• ';
      const nv = v.slice(0, caret) + insert + v.slice(el.selectionEnd);
      onChange(nv);
      setCaret(caret + insert.length);
    }
  }

  return (
    <textarea
      ref={ref}
      value={value}
      placeholder={placeholder}
      onChange={handleChange}
      onKeyDown={handleKeyDown}
    />
  );
}

export { noteToMarkdown } from '../../engine/markdown';
