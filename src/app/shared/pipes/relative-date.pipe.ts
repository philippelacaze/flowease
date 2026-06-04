import { Pipe, PipeTransform } from '@angular/core';

/**
 * Formate une date en texte relatif lisible en français.
 *
 * @remarks
 * Pipe pur utilisé dans JournalHomeComponent et les listes d'entrées.
 * Règle d'affichage : < 1h → "il y a Xmin", < 24h → "il y a Xh",
 * hier → "hier", sinon → "lun. 12 mai".
 *
 * @param value - La date à formater (Date | string | number)
 * @returns Représentation textuelle relative en français
 */
@Pipe({
  name: 'relativeDate',
  standalone: true,
  pure: true,
})
export class RelativeDatePipe implements PipeTransform {
  private static readonly DAY_NAMES = ['dim.', 'lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.'];
  private static readonly MONTH_NAMES = [
    'janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin',
    'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.',
  ];

  transform(value: Date | string | number | null | undefined): string {
    if (!value) return '';
    const date = value instanceof Date ? value : new Date(value);
    if (isNaN(date.getTime())) return '';

    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60_000);
    const diffH = Math.floor(diffMs / 3_600_000);

    if (diffMin < 1)  return "à l'instant";
    if (diffMin < 60) return `il y a ${diffMin}min`;
    if (diffH < 24)   return `il y a ${diffH}h`;

    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) return 'hier';

    const day = RelativeDatePipe.DAY_NAMES[date.getDay()];
    const month = RelativeDatePipe.MONTH_NAMES[date.getMonth()];
    return `${day} ${date.getDate()} ${month}`;
  }
}
