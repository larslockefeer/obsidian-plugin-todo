import { DateParser } from '../util/DateParser';
import { TodoItem, TodoItemStatus } from '../model/TodoItem';
import { DateTime } from 'luxon';
import { extractDueDateFromDailyNotesFile } from '../util/DailyNoteParser';
import { TextPatternParser } from 'util/TextPatternParser';

export class TodoParser {
  private dateParser: DateParser;
  private hideParser: TextPatternParser;
  private somedayParser: TextPatternParser;
  private includeCompleted: boolean;
  private folderParser: TextPatternParser;


  constructor(dateParser: DateParser, somedayParser: TextPatternParser, hideParser: TextPatternParser, folderParser: TextPatternParser, includeCompleted: boolean = false) {
    this.dateParser = dateParser;
    this.hideParser = hideParser;
    this.somedayParser = somedayParser;
    this.includeCompleted = includeCompleted;
    this.folderParser = folderParser;
  }

  public async parseTasks(filePath: string, fileContents: string): Promise<TodoItem[]> {
    // skip file if it doesn't match pattern
    if (!this.folderParser.HasMatch(filePath)) {
      return [];
    }

    const pattern = /(-|\*) \[(\s|x)?\]\s(.*)/g;
    return [...fileContents.matchAll(pattern)].map((task) => this.parseTask(filePath, task)).filter((task) => task != null);
  }

  private parseTask(filePath: string, entry: RegExpMatchArray): TodoItem | null {
    const todoItemOffset = 2; // Strip off `-|* `
    const status = entry[2] === 'x' ? TodoItemStatus.Done : TodoItemStatus.Todo;

    // caught todos are filtered at the end, just stop parsing them now isntead
    if (status == TodoItemStatus.Done && !this.includeCompleted) {
      return null;
    }

    const description = entry[3];

    if (this.hideParser.HasMatch(description)) {
      return null;
    }

    if (this.somedayParser.HasMatch(description)) {
      // don't parse dates for someday tasks
      return new TodoItem(
        status,
        description,
        true,
        filePath,
        (entry.index ?? 0) + todoItemOffset,
        entry[0].length - todoItemOffset,
        undefined
      );
    }

    const actionDate = this.parseDueDate(description, filePath);
    const descriptionWithoutDate = this.dateParser.removeDate(description);

    return new TodoItem(
      status,
      descriptionWithoutDate,
      false,
      filePath,
      (entry.index ?? 0) + todoItemOffset,
      entry[0].length - todoItemOffset,
      actionDate
    );
  }

  private parseDueDate(description: string, filePath: string): DateTime | undefined {
    const taggedDueDate = this.dateParser.parseDate(description);
    if (taggedDueDate) {
      return taggedDueDate;
    }
    return extractDueDateFromDailyNotesFile(filePath);
  }
}
