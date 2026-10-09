'use client';

import { formatPrice, inventoryHref, PRICE_STEPS_CENTS, type InventoryFilters } from '@cp/core';
import { Search } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const ANY = 'any';

interface HeroSearchProps {
  makes: { value: string; label: string; count: number }[];
  models: { value: string; label: string; make: string; count: number }[];
}

/** Make → model → budget, then straight to the filtered inventory. */
export function HeroSearch({ makes, models }: HeroSearchProps) {
  const router = useRouter();
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
      aria-label="Find a vehicle"
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
        <SelectTrigger aria-label="Make" className="h-12 w-full border-0 shadow-none">
          <SelectValue>{make === ANY ? 'Any make' : labelOf(makes, make, 'Any make')}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ANY}>Any make</SelectItem>
          {makes.map((m) => (
            <SelectItem key={m.value} value={m.value}>
              {m.label} ({m.count})
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={model} onValueChange={setModel} disabled={make === ANY}>
        <SelectTrigger aria-label="Model" className="h-12 w-full border-0 shadow-none">
          <SelectValue>
            {model === ANY ? 'Any model' : labelOf(makeModels, model, 'Any model')}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ANY}>Any model</SelectItem>
          {makeModels.map((m) => (
            <SelectItem key={m.value} value={m.value}>
              {m.label} ({m.count})
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={budget} onValueChange={setBudget}>
        <SelectTrigger aria-label="Maximum price" className="h-12 w-full border-0 shadow-none">
          <SelectValue>
            {budget === ANY ? 'Any price' : `Up to ${formatPrice(Number(budget))}`}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ANY}>Any price</SelectItem>
          {PRICE_STEPS_CENTS.map((cents) => (
            <SelectItem key={cents} value={String(cents)}>
              Up to {formatPrice(cents)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button type="submit" size="lg" className="h-12 px-6">
        <Search /> Search
      </Button>
    </form>
  );
}
