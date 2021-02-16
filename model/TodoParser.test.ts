import { TodoItemStatus } from './TodoItem';
import { TodoParser } from './TodoParser';

const todoParser = new TodoParser();

test('parsing an outstanding todo', async () => {
  const contents = `- [ ] This is something that needs doing`;
  const todos = await todoParser.parseTasks('/', contents);
  const todo = todos[0];
  expect(todo.startIndex).toEqual(2);
  expect(todo.length).toEqual(38);
  expect(todo.sourceFilePath).toEqual('/');
  expect(todo.status).toEqual(TodoItemStatus.Todo);
  expect(todo.description).toEqual('This is something that needs doing');
});

test('parsing a completed todo', async () => {
  const contents = `- [x] This is something that has been completed`;
  const todos = await todoParser.parseTasks('/', contents);
  const todo = todos[0];
  expect(todo.startIndex).toEqual(2);
  expect(todo.length).toEqual(45);
  expect(todo.sourceFilePath).toEqual('/');
  expect(todo.status).toEqual(TodoItemStatus.Done);
  expect(todo.description).toEqual('This is something that has been completed');
});

