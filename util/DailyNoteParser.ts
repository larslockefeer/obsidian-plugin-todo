import {
  appHasDailyNotesPluginLoaded,
  getDailyNoteSettings,
  getDateFromPath,
} from 'obsidian-daily-notes-interface';
import { DateTime } from 'luxon';

export const extractDueDateFromDailyNotesFile = (filePath: string): DateTime | undefined => {
  const dailyNotesSettings = getDailyNoteSettings();
  if (!dailyNotesSettings) {
    return undefined;
  }

  const normalizedFilePath = filePath.replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');
  const normalizedFolder = (dailyNotesSettings.folder ?? '').replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');
  const lastSlash = normalizedFilePath.lastIndexOf('/');
  const parentFolder = lastSlash === -1 ? '' : normalizedFilePath.slice(0, lastSlash);

  if (normalizedFolder.length === 0 && !appHasDailyNotesPluginLoaded()) {
    return undefined;
  }

  if (parentFolder !== normalizedFolder) {
    return undefined;
  }

  const dueDate = getDateFromPath(normalizedFilePath, 'day');
  return dueDate == null ? undefined : DateTime.fromISO(dueDate.toISOString());
};
