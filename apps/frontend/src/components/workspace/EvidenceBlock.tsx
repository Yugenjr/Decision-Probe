import React from 'react';
import { Section, Row } from './BlockRenderer';

export interface EvidenceBlockProps {
  block: any;
}

export function EvidenceBlock({ block }: EvidenceBlockProps) {
  const c = block.content || {};

  return (
    <Section title="Evidence" count={1}>
      <Row>
        <span className="mono w-3 text-[10px] text-fg-muted">›</span>
        <span className="mono text-[11px] text-fg-muted uppercase tracking-wider">{c.type || c.source || 'file'}</span>
        <span className="min-w-0 flex-1 truncate text-foreground">{c.title || 'Untitled'}</span>
      </Row>
      {c.snippet && (
        <div className="px-4 mt-1">
          <pre className="text-[11.5px] mono text-fg-muted bg-raised/40 border border-border-subtle rounded-md p-2.5 overflow-x-auto whitespace-pre-wrap max-h-48">
            {c.snippet}
          </pre>
        </div>
      )}
    </Section>
  );
}
