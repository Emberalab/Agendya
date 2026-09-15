import { Injectable } from '@nestjs/common';
import type { BackofficeSearchResult } from '@agendya/types';
import { GLOBAL_SEARCH_RESULT_LIMIT } from '@agendya/types';
import { PrismaService } from '../../../database/prisma.service';
import { TICKET_SUMMARY_SELECT, toSummary } from '../tickets/tickets.service';

/**
 * `ILIKE`-based search across professionals + tickets. Fine at Phase 1
 * scale; a trigram/GIN index is the next step if volume grows (see the
 * Backoffice plan's open items).
 */
@Injectable()
export class BackofficeSearchService {
  constructor(private readonly prisma: PrismaService) {}

  async search(q: string): Promise<BackofficeSearchResult> {
    const [professionals, tickets] = await Promise.all([
      this.prisma.professional.findMany({
        where: {
          OR: [
            { businessName: { contains: q, mode: 'insensitive' } },
            { email: { contains: q, mode: 'insensitive' } },
            { slug: { contains: q, mode: 'insensitive' } },
          ],
        },
        select: { id: true, businessName: true, email: true, slug: true },
        take: GLOBAL_SEARCH_RESULT_LIMIT,
      }),
      this.prisma.supportTicket.findMany({
        where: {
          OR: [{ id: q }, { subject: { contains: q, mode: 'insensitive' } }],
        },
        select: TICKET_SUMMARY_SELECT,
        take: GLOBAL_SEARCH_RESULT_LIMIT,
      }),
    ]);

    return { professionals, tickets: tickets.map(toSummary) };
  }
}
