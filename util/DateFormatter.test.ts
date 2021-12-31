import { DateTime } from 'luxon';
import { DateFormatter } from './DateFormatter';

test('Formatting dates works', () => {
  const firstDateFormatter = new DateFormatter('yyyy-MM-dd');
  const date = DateTime.fromISO('2021-12-29');
  expect(firstDateFormatter.formatDate(date)).toBe('2021-12-29');

  const secondDateFormatter = new DateFormatter('yyyy LLL dd');
  expect(secondDateFormatter.formatDate(date)).toBe('2021 Dec 29');
});
