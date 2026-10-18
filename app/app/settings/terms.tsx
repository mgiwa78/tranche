import React from 'react';

import { LegalDocument } from '../../src/components/LegalDocument';
import { LEGAL_META, termsOfService } from '../../src/content/legal';

export default function TermsScreen() {
  return (
    <LegalDocument
      meta={{ ...LEGAL_META, title: 'Terms' }}
      intro={termsOfService.intro}
      sections={termsOfService.sections}
      contactAfter={termsOfService.sections.at(-1)!.id}
    />
  );
}
