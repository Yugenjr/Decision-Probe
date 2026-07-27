import React from 'react';
import { Section } from './BlockRenderer';

export interface ReasoningBlockProps {
  block: any;
}

export function ReasoningBlock({ block }: ReasoningBlockProps) {
  const c = block.content || {};

  return (
    <Section title="Reasoning">
      <ol className="space-y-2 px-4">
        <li className="fade-in border-l border-border-subtle pl-3">
          <div className="text-[12.5px] text-foreground">
            <span className="text-micro mr-2">Obs</span>
            {c.analysis || c.text || 'Analyzing incident data...'}
          </div>
          {c.evidence_used && (
            <div className="mt-0.5 text-[12px] text-fg-muted">
              <span className="text-micro mr-2">Ev</span>
              <span className="mono">
                {(Array.isArray(c.evidence_used) ? c.evidence_used : [c.evidence_used]).join(' · ')}
              </span>
            </div>
          )}
        </li>
      </ol>
    </Section>
  );
}
