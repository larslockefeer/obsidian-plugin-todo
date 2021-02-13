export enum TodoItemStatus {
  Todo,
  Done,
}

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace TodoItemStatus {
  export function toggleStatus(status: TodoItemStatus): TodoItemStatus {
    switch (status) {
      case TodoItemStatus.Todo:
        return TodoItemStatus.Done;
      case TodoItemStatus.Done:
        return TodoItemStatus.Todo;
    }
  }
}

export class TodoItem {
  public sourceFilePath: string;
  public startIndex: number;
  public length: number;

  public status: TodoItemStatus;
  public description: string;

  constructor(status: TodoItemStatus, description: string, sourceFilePath: string, startIndex: number, length: number) {
    this.status = status;
    this.description = description;
    this.sourceFilePath = sourceFilePath;
    this.startIndex = startIndex;
    this.length = length;
  }
}
