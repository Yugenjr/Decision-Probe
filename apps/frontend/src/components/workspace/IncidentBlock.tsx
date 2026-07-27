import React from 'react';
import { Section } from './BlockRenderer';

export interface IncidentBlockProps {
  block: any;
}

export function IncidentBlock({ block }: IncidentBlockProps) {
  const c = block.content || {};

  // Build key-value pairs like lovable-frontend's dl grid
  const fields: [string, string][] = [];
  if (c.title) fields.push(["Title", c.title]);
  if (c.description) fields.push(["Description", c.description]);
  if (c.observed_issue) fields.push(["Observed Issue", c.observed_issue]);
  if (c.severity) fields.push(["Severity", c.severity]);
  if (c.source) fields.push(["Source", c.source]);
  if (c.affected_systems) {
    const systems = Array.isArray(c.affected_systems) ? c.affected_systems.join(', ') : c.affected_systems;
    fields.push(["Affected", systems]);
  }

  return (
    <Section title="Incident">
      <dl className="grid grid-cols-[120px_1fr] gap-x-4 gap-y-1 px-4 text-[12.5px]">
        {fields.map(([k, v]) => (
          <div key={k} className="contents">
            <dt className="text-fg-muted">{k}</dt>
            <dd className="text-foreground">{v}</dd>
          </div>
        ))}
      </dl>
    </Section>
  );
}
