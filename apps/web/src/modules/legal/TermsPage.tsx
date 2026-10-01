import { LegalPage } from './LegalPage';
import { termsSections, termsLastUpdated } from './content/terms';

export function TermsPage() {
  return (
    <LegalPage
      title="Términos de uso"
      sections={termsSections}
      lastUpdated={termsLastUpdated}
    />
  );
}
