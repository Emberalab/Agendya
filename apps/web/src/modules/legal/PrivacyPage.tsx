import { LegalPage } from './LegalPage';
import { privacySections, privacyLastUpdated } from './content/privacy';

export function PrivacyPage() {
  return (
    <LegalPage
      title="Política de privacidad"
      sections={privacySections}
      lastUpdated={privacyLastUpdated}
    />
  );
}
