import { TodoItem, TodoItemStatus } from '../model/TodoItem';

export class TodoParser {
  async parseTasks(filePath: string, fileContents: string): Promise<TodoItem[]> {
    const pattern = /(-|\*) \[(\s|x)?\]\s(.*)/g;
    return [...fileContents.matchAll(pattern)].map((task) => this.parseTask(filePath, task));
  }

  parseTask(filePath: string, entry: RegExpMatchArray): TodoItem {
    const todoItemOffset = 2; // Strip off `-|* `
    return new TodoItem(
      entry[2] === 'x' ? TodoItemStatus.Done : TodoItemStatus.Todo,
      entry[3],
      filePath,
      entry.index + todoItemOffset,
      entry[0].length - todoItemOffset,
    );
  }
}
