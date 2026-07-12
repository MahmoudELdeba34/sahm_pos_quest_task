import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'highlightMatch', standalone: true })
export class HighlightMatchPipe implements PipeTransform {
  transform(text: string, query: string): string {
    if (!query?.trim()) {
      return this.escape(text);
    }
    const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${escapedQuery})`, 'ig');
    return this.escape(text).replace(regex, '<mark>$1</mark>');
  }

  private escape(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
}
