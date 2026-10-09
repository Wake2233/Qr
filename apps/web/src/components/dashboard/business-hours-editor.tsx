'use client';

import { WEEKDAYS, type BusinessHours, type Weekday } from '@cp/validators';

import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';

const DAY_LABELS: Record<Weekday, string> = {
  mon: 'Monday',
  tue: 'Tuesday',
  wed: 'Wednesday',
  thu: 'Thursday',
  fri: 'Friday',
  sat: 'Saturday',
  sun: 'Sunday',
};

/** Weekly opening hours as `{"mon":"09:00-19:00", "sun": null}` (null = closed). */
export function BusinessHoursEditor({
  value,
  onChange,
  error,
}: {
  value: BusinessHours;
  onChange: (value: BusinessHours) => void;
  error?: string;
}) {
  const set = (day: Weekday, range: string | null) => onChange({ ...value, [day]: range });
  return (
    <fieldset className="space-y-2">
      <legend className="mb-2 text-sm font-medium">Business hours</legend>
      {WEEKDAYS.map((day) => {
        const range = value[day] ?? null;
        const [open = '09:00', close = '18:00'] = range?.split('-') ?? [];
        return (
          <div key={day} className="grid grid-cols-[7rem_auto_1fr] items-center gap-3">
            <span className="text-sm">{DAY_LABELS[day]}</span>
            <Switch
              checked={range !== null}
              onCheckedChange={(on) => set(day, on ? `${open}-${close}` : null)}
              aria-label={`Open on ${DAY_LABELS[day]}`}
            />
            {range !== null ? (
              <div className="flex items-center gap-2">
                <Input
                  type="time"
                  value={open}
                  onChange={(event) => set(day, `${event.target.value}-${close}`)}
                  aria-label={`${DAY_LABELS[day]} opening time`}
                  className="h-9 w-32"
                />
                <span className="text-muted-foreground">to</span>
                <Input
                  type="time"
                  value={close}
                  onChange={(event) => set(day, `${open}-${event.target.value}`)}
                  aria-label={`${DAY_LABELS[day]} closing time`}
                  className="h-9 w-32"
                />
              </div>
            ) : (
              <span className="text-muted-foreground text-sm">Closed</span>
            )}
          </div>
        );
      })}
      {error ? <p className="text-destructive text-sm">{error}</p> : null}
    </fieldset>
  );
}
