import { getDailyNoteSettings, getDateFromPath } from 'obsidian-daily-notes-interface';
import { DateTime } from 'luxon';
import path from 'path';

export const extractDueDateFromDailyNotesFile = (filePath: string): DateTime | undefined => {
  const dailyNotesSettings = getDailyNoteSettings();
  if (dailyNotesSettings.folder && path.dirname(filePath) == dailyNotesSettings.folder) {
    console.log(`Found a daily note ${filePath}`);
    const dueDate = getDateFromPath(filePath, 'day');
    console.log(dueDate);
    console.log(DateTime.fromISO(dueDate.toISOString()));
    return DateTime.fromISO(dueDate.toISOString());
  }
  return undefined;
};
