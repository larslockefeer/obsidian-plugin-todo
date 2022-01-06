import { getDailyNoteSettings, getDateFromPath } from 'obsidian-daily-notes-interface';
import { DateTime } from 'luxon';
import path from 'path';

export const extractDueDateFromDailyNotesFile = (filePath: string): DateTime | undefined => {
  const dailyNotesSettings = getDailyNoteSettings();
  if (dailyNotesSettings.folder && path.dirname(filePath) == dailyNotesSettings.folder) {
    const dueDate = getDateFromPath(filePath, 'day');
    return DateTime.fromISO(dueDate.toISOString());
  }
  return undefined;
};
