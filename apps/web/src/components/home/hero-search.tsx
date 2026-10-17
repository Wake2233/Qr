'use client';

import { formatPrice, inventoryHref, PRICE_STEPS_CENTS, type InventoryFilters } from '@cp/core';
import { Search } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useRouter } from '@/i18n/navigation';

const ANY = 'any';

interface HeroSearchProps {
  makes: { value: string; label: string; count: number }[];
  models: { value: string; label: string; make: string; count: number }[];
}

const withCount = (label: string, count: number) => (count > 0 ? `${label} (${count})` : label);

/** Make → model → budget, then straight to the filtered inventory. Lists the whole catalog. */
export function HeroSearch({ makes, models }: HeroSearchProps) {
  const router = useRouter();
  const t = useTranslations('HeroSearch');
  const [make, setMake] = useState(ANY);
  const [model, setModel] = useState(ANY);
  const [budget, setBudget] = useState(ANY);
  const makeModels = models.filter((m) => m.make === make);

  const submit = () => {
    const filters: InventoryFilters = {};
    if (make !== ANY) filters.make = [make];
    if (model !== ANY) filters.model = [model];
    if (budget !== ANY) filters.priceMaxCents = Number(budget);
    router.push(inventoryHref(filters));
  };

  const labelOf = (list: { value: string; label: string }[], value: string, fallback: string) =>
    list.find((item) => item.value === value)?.label ?? fallback;

  return (
    <form
      role="search"
      aria-label={t('label')}
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
      className="bg-background/80 grid gap-2 rounded-2xl border p-2 shadow-xl backdrop-blur-xl sm:grid-cols-[1fr_1fr_1fr_auto]"
    >
      <Select
        value={make}
        onValueChange={(next) => {
          if (next === make) return;
          setMake(next);
          setModel(ANY);
        }}
      >
        <SelectTrigger aria-label={t('make')} className="h-12 w-full border-0 shadow-none">
          <SelectValue>
            {make === ANY ? t('anyMake') : labelOf(makes, make, t('anyMake'))}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ANY}>{t('anyMake')}</SelectItem>
          {makes.map((m) => (
            <SelectItem key={m.value} value={m.value}>
              {withCount(m.label, m.count)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={model} onValueChange={setModel} disabled={make === ANY}>
        <SelectTrigger aria-label={t('model')} className="h-12 w-full border-0 shadow-none">
          <SelectValue>
            {make === ANY
              ? t('pickMakeFirst')
              : model === ANY
                ? t('anyModel')
                : labelOf(makeModels, model, t('anyModel'))}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ANY}>{t('anyModel')}</SelectItem>
          {makeModels.map((m) => (
            <SelectItem key={m.value} value={m.value}>
              {withCount(m.label, m.count)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={budget} onValueChange={setBudget}>
        <SelectTrigger aria-label={t('maxPrice')} className="h-12 w-full border-0 shadow-none">
          <SelectValue>
            {budget === ANY ? t('anyPrice') : t('upTo', { price: formatPrice(Number(budget)) })}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ANY}>{t('anyPrice')}</SelectItem>
          {PRICE_STEPS_CENTS.map((cents) => (
            <SelectItem key={cents} value={String(cents)}>
              {t('upTo', { price: formatPrice(cents) })}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button type="submit" size="lg" className="h-12 px-6">
        <Search /> {t('search')}
      </Button>
    </form>
  );
}
