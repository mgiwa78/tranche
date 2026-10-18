import { formatNaira, PRODUCT_CATEGORY_LABELS, ProductCategory } from '@tranche/shared';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { RefreshControl, useWindowDimensions, View } from 'react-native';
import Animated, { useAnimatedScrollHandler, useSharedValue } from 'react-native-reanimated';

import { EmptyState } from '../../src/components/EmptyState';
import { useTabBarBottomInset } from '../../src/components/FloatingTabBar';
import { ProductCard } from '../../src/components/shop/ProductCard';
import { useListProductsQuery } from '../../src/store/rtk/customerSlice/catalog.service';
import { useGetSummaryQuery } from '../../src/store/rtk/customerSlice/order.service';
import { useAppSelector } from '../../src/store/hooks';
import { useTheme } from '../../src/theme/ThemeProvider';
import { gutter, radius } from '../../src/theme/tokens';
import { Chips, LargeTitle, Screen, SearchField, Spinner, TabHeader, Text } from '../../src/ui';

type CategoryKey = 'all' | ProductCategory;
const CATEGORIES: { key: CategoryKey; label: string }[] = [
  { key: 'all', label: 'All' },
  ...Object.values(ProductCategory)
    .filter((c) => c !== ProductCategory.OTHER)
    .map((c) => ({ key: c, label: PRODUCT_CATEGORY_LABELS[c] })),
];
const GAP = 14;

export default function ShopScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const bottom = useTabBarBottomInset();
  const scrollY = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler((e) => {
    scrollY.value = e.contentOffset.y;
  });
  const firstName = useAppSelector((s) => s.auth.user?.firstName);

  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<CategoryKey>('all');
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput.trim()), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const { data, isLoading, isFetching, refetch } = useListProductsQuery({
    limit: 40,
    ...(search ? { search } : {}),
    ...(category !== 'all' ? { category } : {}),
  });
  const { data: summary } = useGetSummaryQuery();

  const cardWidth = (width - gutter * 2 - GAP) / 2;
  const rows = useMemo(() => {
    const items = data?.data ?? [];
    const out = [];
    for (let i = 0; i < items.length; i += 2) out.push(items.slice(i, i + 2));
    return out;
  }, [data]);

  return (
    <Screen>
      <TabHeader title="Shop" scrollY={scrollY} />
      <Animated.ScrollView
        onScroll={onScroll}
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingBottom: bottom + 16 }}
        refreshControl={<RefreshControl refreshing={isFetching && !isLoading} onRefresh={refetch} tintColor={colors.ink3} />}
        keyboardShouldPersistTaps="handled"
      >
        <LargeTitle subtitle={firstName ? <Text color="ink3">Hi {firstName}. Split anything into 4.</Text> : undefined}>
          Shop
        </LargeTitle>

        {summary ? (
          <View
            style={{
              marginHorizontal: gutter,
              marginBottom: 18,
              borderRadius: radius.tile,
              backgroundColor: colors.accentWash,
              paddingHorizontal: 16,
              paddingVertical: 12,
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <Text variant="subhead" color="accentInk">
              Available to spend
            </Text>
            <Text variant="callout" weight="semibold" color="accentInk" tabular>
              {formatNaira(summary.availableCreditKobo)}
            </Text>
          </View>
        ) : null}

        <View style={{ paddingHorizontal: gutter, gap: 12, marginBottom: 18 }}>
          <SearchField value={searchInput} onChangeText={setSearchInput} placeholder="Search products" />
          <Chips options={CATEGORIES} selected={category} onSelect={setCategory} />
        </View>

        {isLoading ? (
          <View style={{ paddingTop: 60, alignItems: 'center' }}>
            <Spinner />
          </View>
        ) : rows.length === 0 ? (
          <EmptyState icon="search" title="Nothing here yet" body="Try another search or category." />
        ) : (
          <View style={{ paddingHorizontal: gutter, gap: 22 }}>
            {rows.map((row) => (
              <View key={row[0].id} style={{ flexDirection: 'row', gap: GAP }}>
                {row.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    width={cardWidth}
                    onPress={() => router.push({ pathname: '/product/[id]', params: { id: product.id } })}
                  />
                ))}
              </View>
            ))}
          </View>
        )}
      </Animated.ScrollView>
    </Screen>
  );
}
