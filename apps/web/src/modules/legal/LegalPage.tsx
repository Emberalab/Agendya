import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import type { LegalSection } from './content/terms';

interface LegalPageProps {
  title: string;
  sections: LegalSection[];
  lastUpdated: string;
}

/**
 * Shared component for rendering legal documents (Terms of Use, Privacy Policy).
 *
 * Displays structured legal content with:
 * - Numbered sections
 * - Nested subsections
 * - Lists and paragraphs
 * - Simple, accessible styling
 */
export function LegalPage({ title, sections, lastUpdated }: LegalPageProps) {
  const navigate = useNavigate();

  useEffect(() => {
    // Scroll to top when component mounts
    window.scrollTo(0, 0);
  }, []);

  return (
    <div
      style={{
        minHeight: '100vh',
        // These referenced --color-bg-*/--radius-*/--shadow-md/--font-heading
        // tokens that never existed in this app, so the card rendered with
        // no background, radius or shadow and headings lost their font.
        background: 'var(--color-surface-soft)',
        padding: '2rem 1rem',
      }}
    >
      <article
        style={{
          maxWidth: '50rem',
          margin: '0 auto',
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: '24px',
          padding: 'clamp(1.25rem, 4vw, 2.5rem)',
        }}
      >
        {/* Header */}
        <header style={{ marginBottom: '2rem', textAlign: 'center' }}>
          <h1
            style={{
              fontSize: '1.875rem',
              fontWeight: 700,
              color: 'var(--color-text-primary)',
              marginBottom: '0.5rem',
              fontFamily: 'var(--font-display)',
            }}
          >
            {title}
          </h1>
          <p
            style={{
              fontSize: '0.875rem',
              color: 'var(--color-text-secondary)',
              fontFamily: 'var(--font-body)',
            }}
          >
            Última actualización: {lastUpdated}
          </p>
        </header>

        {/* Legal Content */}
        <div
          style={{
            color: 'var(--color-text-primary)',
            lineHeight: 1.7,
            fontFamily: 'var(--font-body)',
          }}
        >
          {sections.map((section, index) => (
            <section
              key={index}
              style={{
                marginBottom: index === sections.length - 1 ? 0 : '2rem',
              }}
            >
              {/* Section Title */}
              <h2
                style={{
                  fontSize: '1.25rem',
                  fontWeight: 600,
                  color: 'var(--color-text-primary)',
                  marginBottom: '1rem',
                  fontFamily: 'var(--font-display)',
                }}
              >
                {section.title}
              </h2>

              {/* Section Content */}
              {section.content.map((item, itemIndex) => {
                // String paragraph
                if (typeof item === 'string') {
                  return (
                    <p
                      key={itemIndex}
                      style={{
                        marginBottom: '1rem',
                        color: 'var(--color-text-primary)',
                      }}
                    >
                      {item}
                    </p>
                  );
                }

                // Array of strings (bulleted list)
                if (Array.isArray(item)) {
                  return (
                    <ul
                      key={itemIndex}
                      style={{
                        marginBottom: '1rem',
                        paddingLeft: '1.5rem',
                        listStyleType: 'disc',
                      }}
                    >
                      {item.map((listItem, listIndex) => (
                        <li
                          key={listIndex}
                          style={{
                            marginBottom: '0.5rem',
                            color: 'var(--color-text-primary)',
                          }}
                        >
                          {listItem}
                        </li>
                      ))}
                    </ul>
                  );
                }

                // Object with nested title and items (subsection)
                if (typeof item === 'object' && 'title' in item && 'items' in item) {
                  return (
                    <div key={itemIndex} style={{ marginBottom: '1rem' }}>
                      <h3
                        style={{
                          fontSize: '1rem',
                          fontWeight: 600,
                          color: 'var(--color-text-primary)',
                          marginBottom: '0.5rem',
                        }}
                      >
                        {item.title}
                      </h3>
                      <ul
                        style={{
                          paddingLeft: '1.5rem',
                          listStyleType: 'disc',
                        }}
                      >
                        {item.items.map((subItem, subIndex) => (
                          <li
                            key={subIndex}
                            style={{
                              marginBottom: '0.5rem',
                              color: 'var(--color-text-primary)',
                            }}
                          >
                            {subItem}
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                }

                return null;
              })}
            </section>
          ))}
        </div>

        {/* Footer Actions */}
        <footer
          style={{
            marginTop: '3rem',
            paddingTop: '2rem',
            borderTop: '1px solid var(--color-border)',
            display: 'flex',
            justifyContent: 'center',
          }}
        >
          <button
            type="button"
            // Opened straight from a link (new tab, email footer) there is no
            // in-app history to go back to; -1 would leave the site or do
            // nothing, so fall back to the app's entry point.
            onClick={() =>
              window.history.length > 1 ? navigate(-1) : navigate('/')
            }
            style={{
              padding: '0.75rem 1.5rem',
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-control)',
              color: 'var(--color-text-primary)',
              fontSize: '0.875rem',
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'all 0.2s',
              fontFamily: 'var(--font-body)',
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.background = 'var(--color-surface-soft)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = 'var(--color-surface)';
            }}
          >
            Volver
          </button>
        </footer>
      </article>
    </div>
  );
}
