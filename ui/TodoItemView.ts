import { ItemView, MarkdownRenderer, WorkspaceLeaf } from 'obsidian';
import { VIEW_TYPE_TODO } from '../constants';
import { TodoItem, TodoItemStatus } from '../model/TodoItem';
import { RenderIcon, Icon } from '../ui/icons';

export interface TodoItemViewProps {
  openFile: (filePath: string) => void;
  toggleTodo: (todo: TodoItem, newStatus: TodoItemStatus) => void;
}

export class TodoItemView extends ItemView {
  private props: TodoItemViewProps;

  constructor(leaf: WorkspaceLeaf, props: TodoItemViewProps) {
    super(leaf);
    this.props = props;
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

  render(todos: TodoItem[]): void {
    const container = this.containerEl.children[1];
    container.empty();
    container.createDiv('container todo-item-view-container', (el) => {
      todos.forEach((todo) => {
        el.createDiv('todo-item-view-item', (el) => {
          el.createDiv('item todo-item-view-item-checkbox', (el) => {
            el.createEl('input', { type: 'checkbox' }, (el) => {
              el.checked = todo.status === TodoItemStatus.Done;
              el.onClickEvent(() => {
                this.toggleTodo(todo);
              });
            });
          });
          el.createDiv('item todo-item-view-item-description', (el) => {
            MarkdownRenderer.renderMarkdown(todo.description, el, todo.sourceFilePath, this);
          });
          el.createDiv('item todo-item-view-item-link', (el) => {
            el.appendChild(RenderIcon(Icon.Reveal, 'Open file'));
            el.onClickEvent(() => {
              this.openFile(todo);
            });
          });
        });
      });
    });
  }

  private toggleTodo(todo: TodoItem): void {
    this.props.toggleTodo(todo, TodoItemStatus.toggleStatus(todo.status));
  }

  private openFile(todo: TodoItem): void {
    this.props.openFile(todo.sourceFilePath);
  }
}
