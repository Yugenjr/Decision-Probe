import React from 'react';
import { Section } from './BlockRenderer';

export interface DecisionBlockProps {
  block: any;
}

export function DecisionBlock({ block }: DecisionBlockProps) {
  const c = block.content || {};

  const confValue = c.Confidence;
  const confDisplay = typeof confValue === 'number' 
    ? (confValue > 1 ? (confValue / 100).toFixed(2) : confValue.toFixed(2))
    : confValue;

  const riskLevel = c['Risk Level'] || c.Risk || 'Unknown';
  const riskColor = (() => {
    const l = riskLevel?.toLowerCase?.();
    if (l === 'high' || l === 'critical') return 'bg-danger';
    if (l === 'medium') return 'bg-warning';
    return 'bg-success';
  })();

  return (
    <Section title="Decision">
      <div className="mx-4 rounded-md border border-border bg-panel p-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-micro">Recommendation</div>
            <div className="mt-0.5 text-[13px] text-fg-strong">{c.Decision || c.text || 'Pending analysis...'}</div>
          </div>
          {confValue != null && (
            <div className="shrink-0 text-right">
              <div className="text-micro">Confidence</div>
              <div className="mono text-[13px] text-accent">{confDisplay}</div>
            </div>
          )}
        </div>

        {c.Reasoning && (
          <div className="mt-3 border-t border-border-subtle pt-3 text-[12px] text-fg-muted">
            {c.Reasoning}
          </div>
        )}

        <div className="mt-3 grid grid-cols-3 gap-4 border-t border-border-subtle pt-3 text-[12px]">
          <div>
            <div className="text-micro">Risk</div>
            <div className="mt-0.5 flex items-center gap-1.5 text-foreground">
              <span className={`h-1.5 w-1.5 rounded-full ${riskColor}`} />
              {riskLevel}
            </div>
          </div>
          {c['Alternative Actions'] && (
            <div>
              <div className="text-micro">Alternatives</div>
              <div className="mt-0.5 text-foreground">
                {(Array.isArray(c['Alternative Actions']) ? c['Alternative Actions'].length : 1)} evaluated
              </div>
            </div>
          )}
          {c['Missing Information'] && (
            <div>
              <div className="text-micro">Gaps</div>
              <div className="mt-0.5 text-warning">
                {(Array.isArray(c['Missing Information']) ? c['Missing Information'].length : 1)} items
              </div>
            </div>
          )}
        </div>

        {/* Alternatives detail */}
        {c['Alternative Actions'] && (
          <div className="mt-3 border-t border-border-subtle pt-3">
            <div className="text-micro mb-1">Alternatives evaluated</div>
            {(Array.isArray(c['Alternative Actions']) ? c['Alternative Actions'] : [c['Alternative Actions']]).map((alt: string, i: number) => (
              <div key={i} className="text-[12px] text-fg-muted py-0.5">– {alt}</div>
            ))}
          </div>
        )}

        {/* Missing info */}
        {c['Missing Information'] && (
          <div className="mt-3 border-t border-border-subtle pt-3">
            <div className="text-micro mb-1">Missing context</div>
            {(Array.isArray(c['Missing Information']) ? c['Missing Information'] : [c['Missing Information']]).map((info: string, i: number) => (
              <div key={i} className="text-[12px] text-warning/70 py-0.5 flex items-center gap-1.5">
                <span className="mono text-[10px] text-warning">⚠</span> {info}
              </div>
            ))}
          </div>
        )}

        {/* Next step */}
        {c['Recommended Next Step'] && (
          <div className="mt-3 flex items-center gap-2">
            <button className="flex h-6 items-center gap-1.5 rounded border border-accent/40 bg-accent/10 px-2 text-[12px] text-accent hover:bg-accent/20">
              {c['Recommended Next Step']}
            </button>
          </div>
        )}
      </div>
    </Section>
  );
}
