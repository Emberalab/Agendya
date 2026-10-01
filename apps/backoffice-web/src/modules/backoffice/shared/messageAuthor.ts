import type { MessageAuthor } from '@agendya/types';

/** A ticket message is authored by either staff or the professional themselves. */
export function authorLabel(author: MessageAuthor): string {
  return author.kind === 'INTERNAL'
    ? author.name
    : `${author.businessName} (profesional)`;
}
