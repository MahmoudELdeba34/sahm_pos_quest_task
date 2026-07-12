import { HighlightMatchPipe } from './highlight-match.pipe';

describe('HighlightMatchPipe', () => {
  const pipe = new HighlightMatchPipe();

  it('wraps case-insensitive matches in mark tags', () => {
    expect(pipe.transform('Chicken Burger', 'burg')).toContain('<mark>Burg</mark>');
  });

  it('escapes HTML in the source text', () => {
    const result = pipe.transform('<script>', 'script');
    expect(result).not.toContain('<script>');
    expect(result).toContain('&lt;');
    expect(result).toContain('<mark>script</mark>');
  });
});
