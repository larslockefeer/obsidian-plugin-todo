jest.mock('obsidian-daily-notes-interface', () => ({
  appHasDailyNotesPluginLoaded: jest.fn(),
  getDailyNoteSettings: jest.fn(),
  getDateFromPath: jest.fn(),
}));

import {
  appHasDailyNotesPluginLoaded,
  getDailyNoteSettings,
  getDateFromPath,
} from 'obsidian-daily-notes-interface';
import { extractDueDateFromDailyNotesFile } from './DailyNoteParser';

const mockDailyNoteSettings = getDailyNoteSettings as jest.MockedFunction<typeof getDailyNoteSettings>;
const mockDailyNotesLoaded = appHasDailyNotesPluginLoaded as jest.MockedFunction<
  typeof appHasDailyNotesPluginLoaded
>;
const mockGetDateFromPath = getDateFromPath as jest.MockedFunction<typeof getDateFromPath>;

beforeEach(() => {
  jest.resetAllMocks();
  mockDailyNotesLoaded.mockReturnValue(true);
  mockGetDateFromPath.mockReturnValue(
    new Date('2024-01-02T00:00:00.000Z') as unknown as ReturnType<typeof getDateFromPath>,
  );
});

test('matches a configured folder using normalized vault paths', () => {
  mockDailyNoteSettings.mockReturnValue({ folder: '\\Notes\\' });

  const dueDate = extractDueDateFromDailyNotesFile('\\Notes\\2024-01-02.md');

  expect(mockGetDateFromPath).toHaveBeenCalledWith('Notes/2024-01-02.md', 'day');
  expect(dueDate?.toISODate()).toBe('2024-01-02');
});

test('recognizes daily notes in the vault root when the plugin is enabled', () => {
  mockDailyNoteSettings.mockReturnValue({ folder: '' });

  const dueDate = extractDueDateFromDailyNotesFile('2024-01-02.md');

  expect(mockGetDateFromPath).toHaveBeenCalledWith('2024-01-02.md', 'day');
  expect(dueDate?.toISODate()).toBe('2024-01-02');
});

test('does not treat vault-root files as daily notes when the plugin is disabled', () => {
  mockDailyNoteSettings.mockReturnValue({ folder: '' });
  mockDailyNotesLoaded.mockReturnValue(false);

  expect(extractDueDateFromDailyNotesFile('2024-01-02.md')).toBeUndefined();
  expect(mockGetDateFromPath).not.toHaveBeenCalled();
});
