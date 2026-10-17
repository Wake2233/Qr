import { notFound } from 'next/navigation';

/** Unknown paths render the localized not-found page inside the root layout. */
export default function CatchAll() {
  notFound();
}
