'use client';

import type { CatalogData } from '@cp/api';
import { bodyTypeLabels, featureCategoryLabels } from '@cp/core';
import type { Enums } from '@cp/types';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import { useMemo, useState, useTransition } from 'react';
import { toast } from 'sonner';

import { addCatalogEntry, removeCatalogEntry } from '@/app/dashboard/catalog/actions';
import { OptionSelect, optionsOf } from '@/components/dashboard/form-fields';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export function CatalogManager({ catalog }: { catalog: CatalogData }) {
  const [pending, startTransition] = useTransition();
  const [makeId, setMakeId] = useState<number | null>(catalog.makes[0]?.id ?? null);
  const [name, setName] = useState({ make: '', model: '', feature: '' });
  const [bodyType, setBodyType] = useState<Enums<'body_type'> | null>(null);
  const [category, setCategory] = useState<Enums<'feature_category'> | null>('comfort');
  const [filter, setFilter] = useState('');

  const models = useMemo(
    () => catalog.models.filter((m) => m.make_id === makeId),
    [catalog.models, makeId],
  );
  const makeName = (id: number) => catalog.makes.find((m) => m.id === id)?.name ?? '';
  const matches = (text: string) => text.toLowerCase().includes(filter.trim().toLowerCase());

  const submit = (kind: 'make' | 'model' | 'feature') =>
    startTransition(async () => {
      const values =
        kind === 'make'
          ? { name: name.make }
          : kind === 'model'
            ? { name: name.model, make_id: makeId, default_body_type: bodyType }
            : { name: name.feature, category };
      const result = await addCatalogEntry({ kind, values });
      if (!result.ok) {
        toast.error(result.fieldErrors?.slug?.[0] ?? result.error);
        return;
      }
      toast.success(`${name[kind]} added`);
      setName((prev) => ({ ...prev, [kind]: '' }));
    });

  const remove = (table: 'makes' | 'models' | 'features', id: number, label: string) =>
    startTransition(async () => {
      const result = await removeCatalogEntry({ table, id });
      if (result.ok) toast.success(`${label} removed`);
      else toast.error(result.error);
    });

  const row = (key: number, label: string, detail: string, usage: number, onRemove: () => void) => (
    <li key={key} className="flex items-center gap-3 px-3 py-2 text-sm">
      <span className="min-w-0 flex-1 truncate font-medium">{label}</span>
      <span className="text-muted-foreground hidden sm:inline">{detail}</span>
      <span className="text-muted-foreground w-24 text-right tabular-nums">{usage} in use</span>
      <Button
        variant="ghost"
        size="icon"
        disabled={pending || usage > 0}
        title={usage > 0 ? 'Used by listings; cannot be removed' : undefined}
        aria-label={`Remove ${label}`}
        onClick={onRemove}
      >
        <Trash2 />
      </Button>
    </li>
  );

  return (
    <Tabs defaultValue="makes" className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <TabsList>
          <TabsTrigger value="makes">Makes ({catalog.makes.length})</TabsTrigger>
          <TabsTrigger value="models">Models ({catalog.models.length})</TabsTrigger>
          <TabsTrigger value="features">Features ({catalog.features.length})</TabsTrigger>
        </TabsList>
        <Input
          type="search"
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
          placeholder="Filter…"
          aria-label="Filter catalog"
          className="h-9 w-48"
        />
      </div>

      <TabsContent value="makes" className="space-y-4">
        <form
          className="flex flex-wrap items-end gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            submit('make');
          }}
        >
          <div className="space-y-1.5">
            <Label htmlFor="new-make">New make</Label>
            <Input
              id="new-make"
              value={name.make}
              onChange={(e) => setName({ ...name, make: e.target.value })}
              placeholder="Genesis"
            />
          </div>
          <Button type="submit" disabled={pending || !name.make.trim()}>
            {pending ? <Loader2 className="animate-spin" /> : <Plus />} Add make
          </Button>
        </form>
        <ul className="bg-card divide-y rounded-xl border">
          {catalog.makes
            .filter((m) => matches(m.name))
            .map((m) => row(m.id, m.name, m.slug, m.usage, () => remove('makes', m.id, m.name)))}
        </ul>
      </TabsContent>

      <TabsContent value="models" className="space-y-4">
        <form
          className="flex flex-wrap items-end gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            submit('model');
          }}
        >
          <div className="w-44 space-y-1.5">
            <Label htmlFor="model-make">Make</Label>
            <OptionSelect
              id="model-make"
              allowNone={false}
              value={makeId}
              onChange={setMakeId}
              options={catalog.makes.map((m) => ({ value: m.id, label: m.name }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="new-model">New model</Label>
            <Input
              id="new-model"
              value={name.model}
              onChange={(e) => setName({ ...name, model: e.target.value })}
              placeholder="GV80"
            />
          </div>
          <div className="w-44 space-y-1.5">
            <Label htmlFor="model-body">Default body</Label>
            <OptionSelect
              id="model-body"
              value={bodyType}
              onChange={setBodyType}
              options={optionsOf(bodyTypeLabels)}
            />
          </div>
          <Button type="submit" disabled={pending || !name.model.trim() || !makeId}>
            {pending ? <Loader2 className="animate-spin" /> : <Plus />} Add model
          </Button>
        </form>
        <ul className="bg-card divide-y rounded-xl border">
          {(filter
            ? catalog.models.filter((m) => matches(`${makeName(m.make_id)} ${m.name}`))
            : models
          ).map((m) =>
            row(
              m.id,
              `${makeName(m.make_id)} ${m.name}`,
              m.default_body_type ? bodyTypeLabels[m.default_body_type] : '—',
              m.usage,
              () => remove('models', m.id, m.name),
            ),
          )}
        </ul>
      </TabsContent>

      <TabsContent value="features" className="space-y-4">
        <form
          className="flex flex-wrap items-end gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            submit('feature');
          }}
        >
          <div className="space-y-1.5">
            <Label htmlFor="new-feature">New feature</Label>
            <Input
              id="new-feature"
              value={name.feature}
              onChange={(e) => setName({ ...name, feature: e.target.value })}
              placeholder="Head-up display"
            />
          </div>
          <div className="w-44 space-y-1.5">
            <Label htmlFor="feature-category">Category</Label>
            <OptionSelect
              id="feature-category"
              allowNone={false}
              value={category}
              onChange={setCategory}
              options={optionsOf(featureCategoryLabels)}
            />
          </div>
          <Button type="submit" disabled={pending || !name.feature.trim() || !category}>
            {pending ? <Loader2 className="animate-spin" /> : <Plus />} Add feature
          </Button>
        </form>
        <ul className="bg-card divide-y rounded-xl border">
          {catalog.features
            .filter((f) => matches(f.name))
            .map((f) =>
              row(f.id, f.name, featureCategoryLabels[f.category], f.usage, () =>
                remove('features', f.id, f.name),
              ),
            )}
        </ul>
      </TabsContent>
    </Tabs>
  );
}
