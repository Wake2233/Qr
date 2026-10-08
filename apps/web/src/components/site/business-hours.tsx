import { WEEKDAYS, type BusinessHours as Hours, type Weekday } from '@cp/validators';

const DAY_LABELS: Record<Weekday, string> = {
  mon: 'Monday',
  tue: 'Tuesday',
  wed: 'Wednesday',
  thu: 'Thursday',
  fri: 'Friday',
  sat: 'Saturday',
  sun: 'Sunday',
};

const to12h = (hhmm: string) => {
  const [h = 0, m = 0] = hhmm.split(':').map(Number);
  const suffix = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 === 0 ? 12 : h % 12;
  return m === 0 ? `${hour} ${suffix}` : `${hour}:${String(m).padStart(2, '0')} ${suffix}`;
};

/** "9 AM – 7 PM" for "09:00-19:00"; days missing from the table aren't shown. */
export function formatHoursRange(range: string) {
  const [open = '', close = ''] = range.split('-');
  return `${to12h(open)} – ${to12h(close)}`;
}

export function BusinessHours({ hours }: { hours: Hours }) {
  const days = WEEKDAYS.filter((day) => day in hours);
  if (days.length === 0) return null;
  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
      {days.map((day) => {
        const range = hours[day];
        return (
          <div key={day} className="contents">
            <dt className="text-muted-foreground">{DAY_LABELS[day]}</dt>
            <dd>{range ? formatHoursRange(range) : 'Closed'}</dd>
          </div>
        );
      })}
    </dl>
  );
}
