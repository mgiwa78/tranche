import React from 'react';

import { LegalDocument } from '../../src/components/LegalDocument';
import { LEGAL_META, privacyPolicy } from '../../src/content/legal';

export default function PrivacyScreen() {
  return (
    <LegalDocument
      meta={{ ...LEGAL_META, title: 'Privacy' }}
      intro={privacyPolicy.intro}
      sections={privacyPolicy.sections}
      contactAfter={privacyPolicy.sections.at(-1)!.id}
    />
  );
}
