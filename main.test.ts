import { DateTime } from 'luxon';
import { App, PluginManifest, WorkspaceLeaf } from 'obsidian';
import TodoPlugin from './main';
import { VIEW_TYPE_TODO } from './constants';
import { TodoIndex } from './model/TodoIndex';
import { TodoItem, TodoItemStatus } from './model/TodoItem';
import { DEFAULT_SETTINGS, TodoPluginSettings } from './model/TodoPluginSettings';
import { TodoItemViewProps } from './ui/TodoItemView';

// Prefer source over the checked-in main.js bundle without changing Jest's config.
jest.mock('./main', () => jest.requireActual<typeof import('./main')>('./main.ts'));
jest.mock(
  'obsidian',
  () => ({
    Plugin: class {
      constructor(public app: App) {}
      loadData = jest.fn<Promise<unknown>, []>();
      registerView = jest.fn();
      addSettingTab = jest.fn();
    },
    TFile: class {},
  }),
  { virtual: true },
);
jest.mock('./model/TodoIndex', () => ({ TodoIndex: jest.fn() }));
jest.mock('./ui/SettingsTab', () => ({ SettingsTab: jest.fn() }));
jest.mock('./ui/TodoItemView', () => ({
  TodoItemView: class {
    constructor(public leaf: WorkspaceLeaf, public props: TodoItemViewProps) {}
    setProps = jest.fn((setter: (props: TodoItemViewProps) => TodoItemViewProps) => {
      this.props = setter(this.props);
    });
  },
}));
// main.ts uses the tsconfig baseUrl alias, which Jest does not resolve itself.
jest.mock(
  'util/DateFormatter',
  () => jest.requireActual<typeof import('./util/DateFormatter')>('./util/DateFormatter'),
  { virtual: true },
);

interface TestView {
  props: TodoItemViewProps;
  setProps: jest.Mock;
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

async function flushPromises(): Promise<void> {
  for (let i = 0; i < 10; i++) await Promise.resolve();
}

function task(description: string): TodoItem {
  return new TodoItem(TodoItemStatus.Todo, description, false, 'tasks.md', 0, 10);
}

function setup(savedSettings: Partial<TodoPluginSettings> = {}) {
  const loadedSettings = deferred<unknown>();
  const initialScan = deferred<void>();
  const leaves: WorkspaceLeaf[] = [];
  let todos: TodoItem[] = [];
  let indexing = false;
  let notify!: (todos: TodoItem[]) => void;
  const index = {
    getTodos: jest.fn(() => todos),
    isIndexing: jest.fn(() => indexing),
    setSettings: jest.fn<void, [TodoPluginSettings]>(),
    initialize: jest.fn(async () => {
      indexing = true;
      notify(todos);
      await initialScan.promise;
      indexing = false;
      notify(todos);
    }),
    dispose: jest.fn(),
  };
  jest.mocked(TodoIndex).mockImplementation((_vault, _settings, listener) => {
    notify = listener;
    return (index as unknown) as TodoIndex;
  });
  const rightLeaf = {
    setViewState: jest.fn<Promise<void>, [unknown]>().mockResolvedValue(undefined),
  };
  const workspace = {
    getLeavesOfType: jest.fn(() => leaves),
    getRightLeaf: jest.fn(() => rightLeaf),
    onLayoutReady: jest.fn<void, [() => void]>(),
  };
  const app = ({ vault: {}, workspace } as unknown) as App;
  const plugin = new TodoPlugin(app, {} as PluginManifest);
  jest.spyOn(plugin, 'loadData').mockReturnValue(loadedSettings.promise);
  const registerView = jest.spyOn(plugin, 'registerView');

  async function load() {
    plugin.onload();
    loadedSettings.resolve(savedSettings);
    await flushPromises();
    expect(registerView).toHaveBeenCalledWith(VIEW_TYPE_TODO, expect.any(Function));
  }

  function layoutReady() {
    expect(workspace.onLayoutReady).toHaveBeenCalledTimes(1);
    workspace.onLayoutReady.mock.calls[0][0]();
  }

  function createView() {
    const leaf = {} as WorkspaceLeaf;
    const view = (registerView.mock.calls[0][1](leaf) as unknown) as TestView;
    Object.assign(leaf, { view });
    leaves.push(leaf);
    return view;
  }

  function publish(nextTodos: TodoItem[]) {
    todos = nextTodos;
    notify(todos);
  }

  async function finishIndex() {
    initialScan.resolve();
    await flushPromises();
  }

  return {
    plugin,
    index,
    workspace,
    rightLeaf,
    leaves,
    loadedSettings,
    registerView,
    load,
    layoutReady,
    createView,
    publish,
    finishIndex,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
});

test('a view created after indexing gets the retained tasks without another index notification', async () => {
  const harness = setup();
  await harness.load();
  harness.layoutReady();
  const todos = [task('already indexed')];
  harness.publish(todos);
  await harness.finishIndex();
  expect(harness.leaves).toHaveLength(0);

  const view = harness.createView();

  expect(view.props.todos).toBe(todos);
  expect(view.props.isIndexing).toBe(false);
  expect(view.setProps).not.toHaveBeenCalled();
  expect(harness.index.initialize).toHaveBeenCalledTimes(1);
});

test('reopening a view reads the latest snapshot instead of its old props or an empty list', async () => {
  const harness = setup();
  await harness.load();
  harness.layoutReady();
  const original = [task('original task')];
  harness.publish(original);
  await harness.finishIndex();
  const closedView = harness.createView();
  expect(closedView.props.todos).toBe(original);
  harness.leaves.splice(0);

  const updated = [task('changed while the view was closed'), task('new task')];
  harness.publish(updated);
  const reopenedView = harness.createView();

  expect(reopenedView).not.toBe(closedView);
  expect(reopenedView.props.todos).toBe(updated);
  expect(reopenedView.props.isIndexing).toBe(false);
  expect(reopenedView.setProps).not.toHaveBeenCalled();
  expect(closedView.props.todos).toBe(original);
  expect(harness.index.initialize).toHaveBeenCalledTimes(1);
});

test('a view created during indexing gets partial tasks and loading state, then receives completion', async () => {
  const harness = setup();
  await harness.load();
  harness.layoutReady();
  const partial = [task('first scanned task')];
  harness.publish(partial);

  const view = harness.createView();
  expect(view.props.todos).toBe(partial);
  expect(view.props.isIndexing).toBe(true);
  expect(view.setProps).not.toHaveBeenCalled();
  const formatDate = view.props.formatDate;

  const completed = [...partial, task('last scanned task')];
  harness.publish(completed);
  await harness.finishIndex();
  expect(view.props.todos).toBe(completed);
  expect(view.props.isIndexing).toBe(false);
  expect(view.props.formatDate).toBe(formatDate);
});

test('an empty completed index produces a non-loading view immediately', async () => {
  const harness = setup();
  await harness.load();
  harness.layoutReady();
  await harness.finishIndex();

  const view = harness.createView();
  expect(view.props.todos).toEqual([]);
  expect(view.props.isIndexing).toBe(false);
  expect(view.setProps).not.toHaveBeenCalled();
});

test('saved settings are loaded and merged before indexing and used by the view formatter', async () => {
  const savedSettings = { dateFormat: 'dd/MM/yyyy', dateTagFormat: '@%date%' };
  const harness = setup(savedSettings);
  harness.plugin.onload();
  await flushPromises();
  expect(harness.index.setSettings).not.toHaveBeenCalled();
  expect(harness.index.initialize).not.toHaveBeenCalled();
  expect(harness.registerView).not.toHaveBeenCalled();
  expect(harness.workspace.onLayoutReady).not.toHaveBeenCalled();

  harness.loadedSettings.resolve(savedSettings);
  await flushPromises();
  const expectedSettings = { ...DEFAULT_SETTINGS, ...savedSettings };
  expect(harness.index.setSettings).toHaveBeenCalledWith(expectedSettings);
  expect(harness.plugin.getSettings()).toEqual(expectedSettings);
  expect(harness.index.initialize).not.toHaveBeenCalled();

  harness.layoutReady();
  expect(harness.index.initialize).toHaveBeenCalledTimes(1);
  expect(harness.index.setSettings.mock.invocationCallOrder[0]).toBeLessThan(
    harness.index.initialize.mock.invocationCallOrder[0],
  );
  const view = harness.createView();
  expect(view.props.formatDate(DateTime.fromISO('2026-10-23'))).toBe('23/10/2026');
  await harness.finishIndex();
});

test('indexing starts while initLeaf is still waiting for setViewState', async () => {
  const harness = setup();
  const viewState = deferred<void>();
  harness.rightLeaf.setViewState.mockReturnValue(viewState.promise);
  await harness.load();

  harness.layoutReady();
  expect(harness.rightLeaf.setViewState).toHaveBeenCalledWith({ type: VIEW_TYPE_TODO });
  expect(harness.index.initialize).toHaveBeenCalledTimes(1);
  expect(harness.index.isIndexing()).toBe(true);

  const todos = [task('indexed before the leaf is ready')];
  harness.publish(todos);
  await harness.finishIndex();
  const view = harness.createView();
  expect(view.props.todos).toBe(todos);
  expect(view.props.isIndexing).toBe(false);

  viewState.resolve();
  await flushPromises();
});
