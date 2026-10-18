import { SUPPORT_EMAIL } from '../config/env';

export const LEGAL_META = {
  effectiveDate: '1 October 2026',
  company: 'Tranche (demonstration)',
  addressLines: ['Lagos, Nigeria'],
  stateOfIncorporation: 'Lagos',
  website: 'tranche.ng',
  email: SUPPORT_EMAIL,
} as const;

type Block =
  | { type: 'paragraph'; text: string }
  | { type: 'bullets'; items: string[] }
  | { type: 'numbered'; items: string[] }
  | { type: 'callout'; text: string };

export const termsOfService: { intro: string; sections: { id: string; title: string; blocks: Block[] }[] } = {
  intro:
    'These terms explain how paying with Tranche works. Tranche is a demonstration product; payments run in Paystack test mode and no real money moves.',
  sections: [
    {
      id: '1',
      title: 'Your payment plan',
      blocks: [
        {
          type: 'paragraph',
          text: 'When you check out with Tranche you choose a plan and see every payment date and amount before you confirm. The first payment is taken at checkout.',
        },
        {
          type: 'bullets',
          items: [
            'Pay in 4: four payments, two weeks apart.',
            '3 or 6 months: equal monthly payments.',
            'No interest. Pay any installment early from the app at no cost.',
          ],
        },
      ],
    },
    {
      id: '2',
      title: 'Automatic payments',
      blocks: [
        {
          type: 'paragraph',
          text: 'You authorise Tranche to charge the card saved at checkout on each due date. We remind you before every payment. If a charge fails we tell you and retry over the following days.',
        },
      ],
    },
    {
      id: '3',
      title: 'Late payments',
      blocks: [
        {
          type: 'callout',
          text: 'If a payment is more than the grace period late, a single flat late fee is added to that installment. It is shown in the app before it is charged.',
        },
      ],
    },
    {
      id: '4',
      title: 'Spending limit',
      blocks: [
        {
          type: 'paragraph',
          text: 'Your account has a spending limit. Only the part of your orders you have not paid yet counts towards it.',
        },
      ],
    },
  ],
};

export const privacyPolicy: { intro: string; sections: { id: string; title: string; blocks: Block[] }[] } = {
  intro: 'Tranche collects only what it needs to offer interest-free installments and keep your account safe.',
  sections: [
    {
      id: '1',
      title: 'What we collect',
      blocks: [
        {
          type: 'bullets',
          items: [
            'Your name, email and phone number.',
            'Your orders, installments and payment history.',
            'A reusable card token from Paystack, encrypted at rest. We never see or store your full card number.',
            'A push token for this device, if you allow notifications.',
          ],
        },
      ],
    },
    {
      id: '2',
      title: 'How we use it',
      blocks: [
        {
          type: 'paragraph',
          text: 'To schedule and collect your payments, send reminders and receipts, and prevent fraud. Stores see your name, email and what you owe on their orders. We never sell your data.',
        },
      ],
    },
  ],
};
