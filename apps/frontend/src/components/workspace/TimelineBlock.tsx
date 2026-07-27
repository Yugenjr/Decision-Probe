"use client";

import React from 'react';
import { Section } from './BlockRenderer';

export interface TimelineEvent {
  timestamp: string;
  action: string;
}

export interface TimelineBlockProps {
  block: any;
}

export function TimelineBlock({ block }: TimelineBlockProps) {
  const c = block.content || {};
  const events: TimelineEvent[] = c.events || [];

  return (
    <Section title="Timeline" count={events.length}>
      <ol className="relative">
        <span className="absolute left-[104px] top-1 bottom-1 w-px bg-border-subtle" />
        {events.map((event, i) => (
          <li key={i} className="fade-in flex h-6 items-center gap-3 pl-4 pr-4 text-[12.5px] hover:bg-raised/40">
            <span className="mono w-20 shrink-0 text-[11px] text-fg-muted">{event.timestamp}</span>
            <span className="relative z-10 h-1.5 w-1.5 shrink-0 rounded-full bg-fg-muted" />
            <span className="min-w-0 flex-1 truncate text-foreground">{event.action}</span>
          </li>
        ))}
      </ol>
    </Section>
  );
}
