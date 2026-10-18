import React from 'react';
import { Linking, View } from 'react-native';

import { useTheme } from '../theme/ThemeProvider';
import { radius } from '../theme/tokens';
import { StackPage, Text } from '../ui';

type Block =
  | { type: 'paragraph'; text: string }
  | { type: 'bullets'; items: string[] }
  | { type: 'numbered'; items: string[] }
  | { type: 'callout'; text: string };

type Meta = {
  title: string;
  effectiveDate: string;
  company: string;
  addressLines: readonly string[];
  stateOfIncorporation: string;
  website: string;
  email: string;
};

type Props = {
  meta: Meta;
  intro: string | readonly string[];
  sections: { id: string; title: string; blocks: Block[] }[];

  contactAfter: string;
};

function BlockView({ block }: { block: Block }) {
  const { colors } = useTheme();
  if (block.type === 'paragraph') {
    return (
      <Text variant="callout" color="ink2" style={{ lineHeight: 24, marginBottom: 12 }}>
        {block.text}
      </Text>
    );
  }
  if (block.type === 'callout') {
    return (
      <View style={{ backgroundColor: colors.sunken, borderRadius: radius.tile, padding: 16, marginBottom: 12 }}>
        <Text variant="callout" weight="medium" style={{ lineHeight: 23 }}>
          {block.text}
        </Text>
      </View>
    );
  }
  return (
    <View style={{ marginBottom: 12, gap: 8 }}>
      {block.items.map((item, i) => (
        <View key={`${i}-${item.slice(0, 24)}`} style={{ flexDirection: 'row', gap: 10 }}>
          <Text variant="callout" color="ink3" tabular style={{ minWidth: 16, lineHeight: 24 }}>
            {block.type === 'numbered' ? `${i + 1}.` : '•'}
          </Text>
          <Text variant="callout" color="ink2" style={{ flex: 1, lineHeight: 24 }}>
            {item}
          </Text>
        </View>
      ))}
    </View>
  );
}

export function LegalDocument({ meta, intro, sections, contactAfter }: Props) {
  const paragraphs = typeof intro === 'string' ? [intro] : intro;
  return (
    <StackPage title={meta.title} heading={meta.title} intro={`Effective ${meta.effectiveDate}`}>
      {paragraphs.map((p) => (
        <Text key={p.slice(0, 32)} variant="callout" color="ink2" style={{ lineHeight: 24, marginBottom: 14 }}>
          {p}
        </Text>
      ))}
      {sections.map((section) => (
        <View key={section.id} style={{ marginTop: 18 }}>
          <Text variant="title3" style={{ marginBottom: 10 }} accessibilityRole="header">
            {section.id}. {section.title}
          </Text>
          {section.blocks.map((block, i) => (
            <BlockView key={`${section.id}-${i}`} block={block} />
          ))}
          {section.id === contactAfter ? (
            <View style={{ marginTop: 4, gap: 2 }}>
              <Text variant="callout" weight="medium">
                {meta.company}
              </Text>
              {meta.addressLines.map((line) => (
                <Text key={line} variant="callout" color="ink2">
                  {line}
                </Text>
              ))}
              <Text variant="callout" color="ink2">
                State of incorporation: {meta.stateOfIncorporation}
              </Text>
              <Text variant="callout" color="accentInk" accessibilityRole="link" onPress={() => Linking.openURL(`https://${meta.website}`)} style={{ marginTop: 8 }}>
                {meta.website}
              </Text>
              <Text variant="callout" color="accentInk" accessibilityRole="link" onPress={() => Linking.openURL(`mailto:${meta.email}`)}>
                {meta.email}
              </Text>
            </View>
          ) : null}
        </View>
      ))}
    </StackPage>
  );
}
