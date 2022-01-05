import { DateTime } from 'luxon';

export const extractDueDateFromDailyNotesFile = (filePath: string): DateTime | undefined => {
  if (filePath.includes('Daily Notes')) {
    return DateTime.now();
  }
  return undefined;
};
