import { formatPrice } from '@cp/core';
import { Text } from 'react-native';

interface PriceTagProps {
  cents: number;
}

export function PriceTag({ cents }: PriceTagProps) {
  return <Text className="text-xl font-bold text-foreground">{formatPrice(cents)}</Text>;
}
