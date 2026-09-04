import { escapeHtml } from './html.util';

describe('escapeHtml', () => {
  it('leaves plain text untouched', () => {
    expect(escapeHtml('María José')).toBe('María José');
  });

  it('escapes the characters that can open an HTML tag or attribute', () => {
    expect(escapeHtml(`<script>alert('hi')</script>`)).toBe(
      '&lt;script&gt;alert(&#39;hi&#39;)&lt;/script&gt;',
    );
  });

  it('neutralizes a link-injection payload', () => {
    const payload = `<a href="https://evil.example/login">Confirma aquí</a>`;
    const escaped = escapeHtml(payload);
    expect(escaped).not.toContain('<a ');
    expect(escaped).not.toContain('</a>');
    expect(escaped).toContain(
      '&lt;a href=&quot;https://evil.example/login&quot;&gt;',
    );
  });

  it('escapes ampersands so entities are not double-decoded', () => {
    expect(escapeHtml('Corte & Barba')).toBe('Corte &amp; Barba');
  });
});
