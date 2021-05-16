import { ItemView, MarkdownRenderer, WorkspaceLeaf } from 'obsidian';
import { VIEW_TYPE_TODO } from '../constants';
import { TodoItem, TodoItemStatus } from '../model/TodoItem';
import { RenderIcon, Icon } from '../ui/icons';

enum TodoItemViewPane {
  Today,
  Scheduled,
  Inbox,
  Someday,
}
export interface TodoItemViewProps {
  todos: TodoItem[];
  openFile: (filePath: string) => void;
  toggleTodo: (todo: TodoItem, newStatus: TodoItemStatus) => void;
}

interface TodoItemViewState {
  activePane: TodoItemViewPane;
}

export class TodoItemView extends ItemView {
  private props: TodoItemViewProps;
  private state: TodoItemViewState;

  constructor(leaf: WorkspaceLeaf, props: TodoItemViewProps) {
    super(leaf);
    this.props = props;
    this.state = {
      activePane: TodoItemViewPane.Today,
    };
  }

  getViewType(): string {
    return VIEW_TYPE_TODO;
  }

  getDisplayText(): string {
    return 'Todo';
  }

  getIcon(): string {
    return 'checkmark';
  }

  onClose(): Promise<void> {
    return Promise.resolve();
  }

  public setProps(setter: (currentProps: TodoItemViewProps) => TodoItemViewProps): void {
    this.props = setter(this.props);
    this.render();
  }

  private setViewState(newState: TodoItemViewState) {
    this.state = newState;
    this.render();
  }

  private render(): void {
    const container = this.containerEl.children[1];
    container.empty();
    container.createDiv('todo-item-view-container', (el) => {
      el.createDiv('todo-item-view-toolbar', (el) => {
        this.renderToolBar(el);
      });
      el.createDiv('todo-item-view-items', (el) => {
        this.renderItems(el);
      });
    });
  }

  private renderToolBar(container: HTMLDivElement) {
    const activeClass = (pane: TodoItemViewPane) => {
      return pane === this.state.activePane ? ' active' : '';
    };

    const setActivePane = (pane: TodoItemViewPane) => {
      const newState = {
        ...this.state,
        activePane: pane,
      };
      this.setViewState(newState);
    };

    container.createDiv(`todo-item-view-toolbar-item${activeClass(TodoItemViewPane.Today)}`, (el) => {
      el.appendChild(RenderIcon(Icon.Today, 'Today'));
      el.onClickEvent(() => setActivePane(TodoItemViewPane.Today));
    });
    container.createDiv(`todo-item-view-toolbar-item${activeClass(TodoItemViewPane.Scheduled)}`, (el) => {
      el.appendChild(RenderIcon(Icon.Scheduled, 'Scheduled'));
      el.onClickEvent(() => setActivePane(TodoItemViewPane.Scheduled));
    });
    container.createDiv(`todo-item-view-toolbar-item${activeClass(TodoItemViewPane.Inbox)}`, (el) => {
      el.appendChild(RenderIcon(Icon.Inbox, 'Inbox'));
      el.onClickEvent(() => setActivePane(TodoItemViewPane.Inbox));
    });
    container.createDiv(`todo-item-view-toolbar-item${activeClass(TodoItemViewPane.Someday)}`, (el) => {
      el.appendChild(RenderIcon(Icon.Someday, 'Someday / Maybe'));
      el.onClickEvent(() => setActivePane(TodoItemViewPane.Someday));
    });
  }

  private renderItems(container: HTMLDivElement) {
    this.props.todos
      .filter(this.filterForState, this)
      .sort(this.sortByActionDate)
      .forEach((todo) => {
        container.createDiv('todo-item-view-item', (el) => {
          el.createDiv('todo-item-view-item-checkbox', (el) => {
            el.createEl('input', { type: 'checkbox' }, (el) => {
              el.checked = todo.status === TodoItemStatus.Done;
              el.onClickEvent(() => {
                this.toggleTodo(todo);
              });
            });
          });
          el.createDiv('todo-item-view-item-description', (el) => {
            MarkdownRenderer.renderMarkdown(todo.description, el, todo.sourceFilePath, this);
          });
          el.createDiv('todo-item-view-item-link', (el) => {
            el.appendChild(RenderIcon(Icon.Reveal, 'Open file'));
            el.onClickEvent(() => {
              this.openFile(todo);
            });
          });
        });
      });
  }

  private filterForState(value: TodoItem, _index: number, _array: TodoItem[]): boolean {
    const isToday = (date: Date) => {
      const today = new Date();
      return (
        date.getUTCDate() == today.getDate() &&
        date.getUTCMonth() == today.getMonth() &&
        date.getUTCFullYear() == today.getFullYear()
      );
    };

    const isBeforeToday = (date: Date) => {
      const today = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), date.getHours(), date.getMinutes(), date.getSeconds()));
      return date < today;
    };

    const isTodayNote = value.actionDate && (isToday(value.actionDate) || isBeforeToday(value.actionDate));
    const isScheduledNote = !value.isSomedayMaybeNote && value.actionDate && !isTodayNote;

    switch (this.state.activePane) {
      case TodoItemViewPane.Inbox:
        return !value.isSomedayMaybeNote && !isTodayNote && !isScheduledNote;
      case TodoItemViewPane.Scheduled:
        return isScheduledNote;
      case TodoItemViewPane.Someday:
        return value.isSomedayMaybeNote;
      case TodoItemViewPane.Today:
        return isTodayNote;
    }
  }

  private sortByActionDate(a: TodoItem, b: TodoItem): number {
    if (!a.actionDate && !b.actionDate) {
      if (a.isSomedayMaybeNote && !b.isSomedayMaybeNote) {
        return -1;
      }
      if (!a.isSomedayMaybeNote && b.isSomedayMaybeNote) {
        return 1;
      }
      return 0;
    }
    return a.actionDate < b.actionDate ? -1 : a.actionDate > b.actionDate ? 1 : 0;
  }

  private toggleTodo(todo: TodoItem): void {
    this.props.toggleTodo(todo, TodoItemStatus.toggleStatus(todo.status));
  }

  private openFile(todo: TodoItem): void {
    this.props.openFile(todo.sourceFilePath);
  }
}
