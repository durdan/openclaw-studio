/**
 * Inline script to apply the saved theme before React hydrates.
 * Prevents flash of wrong theme on page load.
 */
export function ThemeInitScript() {
  const script = `
    (function() {
      try {
        var theme = localStorage.getItem('openclaw-studio-theme') || 'light';
        document.documentElement.setAttribute('data-theme', theme);
      } catch(e) {}
    })();
  `;

  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}
