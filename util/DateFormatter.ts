import { DateTime } from 'luxon';

export class DateFormatter {
  private dateFormat: string;

  constructor(dateFormat: string) {
    this.dateFormat = dateFormat;
  }

  public formatDate(date: DateTime): string {
    return date.toFormat(this.dateFormat);
  }
}
