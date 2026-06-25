import type { ReactNode } from 'react';

/** A `.section` panel with a `.section-head` (title + optional summary). */
export function Section({
  title,
  summary,
  children,
}: {
  title: ReactNode;
  summary?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="section">
      <div className="section-head">
        <span className="title">{title}</span>
        {summary !== undefined && <span className="summary">{summary}</span>}
      </div>
      {children}
    </section>
  );
}

export type StatusCls = 'good' | 'warn' | 'bad' | 'neutral';

/** A numeric value span carrying a good/warn/bad colour class. */
export function StatusValue({
  cls,
  className = 'val',
  children,
}: {
  cls?: StatusCls;
  className?: string;
  children: ReactNode;
}) {
  return <div className={`${className} ${cls ?? ''}`.trim()}>{children}</div>;
}
