import { useStore } from '../../state/store';

const LABEL = {
  idle: 'Saved',
  saving: 'Saving…',
  saved: 'Saved',
  error: 'Save error',
} as const;

export function SaveStatus() {
  const status = useStore((s) => s.saveStatus);
  return <span className={`save-status ${status}`}>{LABEL[status]}</span>;
}
