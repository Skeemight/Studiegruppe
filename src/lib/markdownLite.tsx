import React from 'react';

// Splits a line into inline React nodes handling **bold** and *italic*
function parseInline(text: string, baseKey: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  const regex = /\*\*(.+?)\*\*|\*(.+?)\*/g;
  let last = 0;
  let i = 0;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > last) parts.push(text.slice(last, match.index));
    if (match[1] !== undefined) {
      parts.push(<strong key={`${baseKey}-b${i}`}>{match[1]}</strong>);
    } else {
      parts.push(<em key={`${baseKey}-i${i}`}>{match[2]}</em>);
    }
    last = regex.lastIndex;
    i++;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts.length === 1 ? parts[0] : <>{parts}</>;
}

/**
 * Renders a minimal markdown string as React JSX.
 * Supports: **bold**, *italic*, - bullet lists, paragraph breaks.
 */
export function MarkdownContent({ content, className }: { content: string; className?: string }) {
  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  let listItems: React.ReactNode[] = [];
  let key = 0;

  function flushList() {
    if (listItems.length > 0) {
      elements.push(
        <ul key={key++} className="list-disc pl-5 space-y-0.5 my-1">
          {listItems}
        </ul>
      );
      listItems = [];
    }
  }

  for (const line of lines) {
    if (line.startsWith('- ')) {
      listItems.push(
        <li key={key++} className="text-sm text-gray-700 leading-snug">
          {parseInline(line.slice(2), `li-${key}`)}
        </li>
      );
    } else {
      flushList();
      if (line.trim() === '') {
        elements.push(<div key={key++} className="h-2" />);
      } else {
        elements.push(
          <p key={key++} className="text-sm text-gray-700 leading-snug">
            {parseInline(line, `p-${key}`)}
          </p>
        );
      }
    }
  }
  flushList();

  return <div className={className ?? 'space-y-1'}>{elements}</div>;
}
