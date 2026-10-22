/* global afterEach -- Jest supplies the cleanup hook in the node test environment. */
import { TAbstractFile, TFile, Vault } from 'obsidian';
import { TodoIndex } from './TodoIndex';
import { TodoItem, TodoItemStatus } from './TodoItem';
import { DEFAULT_SETTINGS } from './TodoPluginSettings';

jest.mock(
  'obsidian',
  () => {
    class TAbstractFile {
      path = '';
    }
    class TFile extends TAbstractFile {
      extension = '';
    }
    return { TAbstractFile, TFile };
  },
  { virtual: true },
);
jest.mock('../util/DailyNoteParser');

function file(path: string): TFile {
  return Object.assign(new TFile(), { path, extension: path.split('.').pop() });
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: Error) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

// Drain the read -> parse -> index promise chains without advancing notification timers.
async function flushPromises(): Promise<void> {
  for (let i = 0; i < 40; i++) await Promise.resolve();
}

function descriptions(todos: TodoItem[]): string[] {
  return todos.map((todo) => todo.description).sort();
}

type Handler = (file: TAbstractFile, oldPath?: string) => void;
type Reference = { event: string; handler: Handler };
const indexes: TodoIndex[] = [];
// Node has no window; install only the browser timers for this fixture.
const nodeGlobal = globalThis;
const originalWindow = Object.getOwnPropertyDescriptor(nodeGlobal, 'window');

function setup(files: TFile[]) {
  const handlers = new Set<Reference>();
  const vault = {
    getMarkdownFiles: jest.fn(() => files),
    cachedRead: jest.fn(async (entry: TFile) => `- [ ] ${entry.path}`),
    on: jest.fn((event: string, handler: Handler) => {
      const reference = { event, handler };
      handlers.add(reference);
      return reference;
    }),
    offref: jest.fn((reference: Reference) => {
      handlers.delete(reference);
    }),
  };
  const listener = jest.fn<void, [TodoItem[]]>();
  const index = new TodoIndex((vault as unknown) as Vault, { ...DEFAULT_SETTINGS }, listener);
  indexes.push(index);
  const emit = (event: string, entry: TAbstractFile, oldPath?: string) => {
    [...handlers].filter((reference) => reference.event === event).forEach(({ handler }) => handler(entry, oldPath));
  };
  return { index, vault, listener, emit };
}

beforeEach(() => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date('2026-01-01T00:00:00Z'));
  Object.defineProperty(nodeGlobal, 'window', {
    configurable: true,
    value: { setTimeout: nodeGlobal.setTimeout, clearTimeout: nodeGlobal.clearTimeout },
  });
});

afterEach(() => {
  indexes.splice(0).forEach((index) => index.dispose());
  jest.restoreAllMocks();
  jest.clearAllTimers();
  jest.useRealTimers();
  if (originalWindow) Object.defineProperty(nodeGlobal, 'window', originalWindow);
  else Reflect.deleteProperty(nodeGlobal, 'window');
});

test('retains outstanding todos for late views and publishes the completed scan immediately', async () => {
  const { index, vault, listener } = setup([file('note.md')]);
  vault.cachedRead.mockResolvedValue('- [ ] outstanding\n- [x] completed');
  expect(index.getTodos()).toEqual([]);
  const initialization = index.initialize();
  expect(index.isIndexing()).toBe(true);
  await initialization;

  expect(index.isIndexing()).toBe(false);
  expect(descriptions(index.getTodos())).toEqual(['outstanding']);
  expect(index.getTodos()[0].status).toBe(TodoItemStatus.Todo);
  expect(listener).toHaveBeenLastCalledWith(index.getTodos());
  const calls = listener.mock.calls.length;
  await jest.advanceTimersByTimeAsync(500);
  expect(listener).toHaveBeenCalledTimes(calls);
  expect(descriptions(index.getTodos())).toEqual(['outstanding']);
});

test('an empty vault completes and delivers an empty snapshot without waiting for a timer', async () => {
  const { index, listener } = setup([]);
  await index.initialize();
  expect(index.getTodos()).toEqual([]);
  expect(index.isIndexing()).toBe(false);
  expect(listener).toHaveBeenLastCalledWith([]);
});

test('reads concurrently with at most eight active reads and publishes progress before completion', async () => {
  const files = Array.from({ length: 17 }, (_, i) => file(`${i}.md`));
  const reads = files.map(() => deferred<string>());
  const { index, vault, listener } = setup(files);
  let active = 0;
  let peak = 0;
  vault.cachedRead.mockImplementation((entry) => {
    active++;
    peak = Math.max(peak, active);
    return reads[files.indexOf(entry)].promise.finally(() => {
      active--;
    });
  });

  const initialization = index.initialize();
  await flushPromises();
  expect(vault.cachedRead).toHaveBeenCalledTimes(8);
  expect(active).toBe(8);
  reads.slice(0, 8).forEach((read, i) => read.resolve(`- [ ] task ${i}`));
  await flushPromises();
  await jest.advanceTimersByTimeAsync(100);

  expect(index.isIndexing()).toBe(true);
  expect(index.getTodos()).toHaveLength(8);
  expect(listener).toHaveBeenLastCalledWith(index.getTodos());
  expect(vault.cachedRead).toHaveBeenCalledTimes(16);
  const partial = listener.mock.calls[listener.mock.calls.length - 1][0];
  reads.slice(8, 16).forEach((read, i) => read.resolve(`- [ ] task ${i + 8}`));
  await flushPromises();
  await jest.advanceTimersByTimeAsync(0);
  reads[16].resolve('- [ ] task 16');
  await initialization;

  expect(peak).toBe(8);
  expect(active).toBe(0);
  expect(index.getTodos()).toHaveLength(17);
  expect(partial).toHaveLength(8);
  expect(index.isIndexing()).toBe(false);
  expect(listener).toHaveBeenLastCalledWith(index.getTodos());
});

test('coalesces rapid scan progress notifications but never delays the final snapshot', async () => {
  const files = Array.from({ length: 25 }, (_, i) => file(`${i}.md`));
  const reads = files.map(() => deferred<string>());
  const { index, vault, listener } = setup(files);
  vault.cachedRead.mockImplementation((entry) => reads[files.indexOf(entry)].promise);
  const initialization = index.initialize();
  await flushPromises();

  reads.slice(0, 8).forEach((read) => read.resolve('- [ ] first'));
  await flushPromises();
  await jest.advanceTimersByTimeAsync(100);
  expect(listener).toHaveBeenLastCalledWith(index.getTodos());
  expect(index.getTodos()).toHaveLength(8);
  const callsAfterFirstProgress = listener.mock.calls.length;

  reads.slice(8, 16).forEach((read) => read.resolve('- [ ] second'));
  await flushPromises();
  await jest.advanceTimersByTimeAsync(1);
  reads.slice(16, 24).forEach((read) => read.resolve('- [ ] third'));
  await flushPromises();
  await jest.advanceTimersByTimeAsync(95);
  expect(listener).toHaveBeenCalledTimes(callsAfterFirstProgress);

  reads[24].resolve('- [ ] last');
  await initialization;
  expect(index.getTodos()).toHaveLength(25);
  expect(listener).toHaveBeenLastCalledWith(index.getTodos());
  const finalCalls = listener.mock.calls.length;
  await jest.advanceTimersByTimeAsync(500);
  expect(listener).toHaveBeenCalledTimes(finalCalls);
});

test('one failed initial read does not abort other batches or leave indexing active', async () => {
  const files = Array.from({ length: 10 }, (_, i) => file(`${i}.md`));
  const { index, vault, listener } = setup(files);
  jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  vault.cachedRead.mockImplementation(async (entry) => {
    if (entry === files[0]) throw new Error('unreadable');
    return `- [ ] ${entry.path}`;
  });
  const initialization = index.initialize();
  await jest.runAllTimersAsync();
  await expect(initialization).resolves.toBeUndefined();
  expect(vault.cachedRead).toHaveBeenCalledTimes(10);
  expect(index.getTodos()).toHaveLength(9);
  expect(index.getTodos().some((todo) => todo.sourceFilePath === '0.md')).toBe(false);
  expect(index.isIndexing()).toBe(false);
  expect(listener).toHaveBeenLastCalledWith(index.getTodos());
});

test('subscribes once before the first read and cleans up every returned event reference', async () => {
  const { index, vault } = setup([file('note.md')]);
  vault.cachedRead.mockImplementation(async () => {
    expect(vault.on.mock.calls.map(([event]) => event).sort()).toEqual(['create', 'delete', 'modify', 'rename']);
    return '- [ ] task';
  });
  await index.initialize();
  await index.initialize();
  expect(vault.on).toHaveBeenCalledTimes(4);
  const references = vault.on.mock.results.map((result) => result.value as Reference);
  index.dispose();
  index.dispose();
  expect(vault.offref).toHaveBeenCalledTimes(4);
  references.forEach((reference) => expect(vault.offref).toHaveBeenCalledWith(reference));
});

test('ignores folder create/modify and never reads or indexes non-markdown file events', async () => {
  const { index, vault, emit } = setup([]);
  await index.initialize();
  class Folder extends TAbstractFile {}
  const folder = Object.assign(new Folder(), { path: 'folder' });
  emit('create', folder);
  emit('modify', folder);
  for (const entry of [file('image.png'), file('notes.txt')]) {
    for (const event of ['create', 'modify', 'delete', 'rename']) emit(event, entry, `old-${entry.path}`);
  }
  await flushPromises();
  await jest.advanceTimersByTimeAsync(200);
  expect(vault.cachedRead).not.toHaveBeenCalled();
  expect(index.getTodos()).toEqual([]);
});

test('applies create, modify, rename and delete events after initialization', async () => {
  const { index, vault, emit } = setup([]);
  await index.initialize();
  const entry = file('created.md');
  emit('create', entry);
  await flushPromises();
  expect(descriptions(index.getTodos())).toEqual(['created.md']);
  vault.cachedRead.mockResolvedValue('- [ ] changed');
  emit('modify', entry);
  await flushPromises();
  expect(descriptions(index.getTodos())).toEqual(['changed']);
  entry.path = 'renamed.md';
  emit('rename', entry, 'created.md');
  await flushPromises();
  expect(index.getTodos().map((todo) => todo.sourceFilePath)).toEqual(['renamed.md']);
  emit('delete', entry);
  await flushPromises();
  expect(index.getTodos()).toEqual([]);
});

test('a failed live read retains the previous result and a later successful edit can clear it', async () => {
  const entry = file('note.md');
  const { index, vault, emit } = setup([entry]);
  await index.initialize();
  jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  vault.cachedRead.mockRejectedValueOnce(new Error('temporarily unreadable'));
  emit('modify', entry);
  await flushPromises();
  expect(descriptions(index.getTodos())).toEqual(['note.md']);
  vault.cachedRead.mockResolvedValue('- [x] finished');
  emit('modify', entry);
  await flushPromises();
  expect(index.getTodos()).toEqual([]);
});

test('startup does not overwrite a live modification or discard a newly created file', async () => {
  const entry = file('original.md');
  const stale = deferred<string>();
  const { index, vault, emit } = setup([entry]);
  vault.cachedRead.mockReturnValueOnce(stale.promise);
  const initialization = index.initialize();
  await flushPromises();
  vault.cachedRead.mockResolvedValueOnce('- [ ] fresh edit').mockResolvedValueOnce('- [ ] created during scan');
  emit('modify', entry);
  emit('create', file('new.md'));
  await flushPromises();
  expect(descriptions(index.getTodos())).toEqual(['created during scan', 'fresh edit']);

  stale.resolve('- [ ] stale initial contents');
  await initialization;
  expect(descriptions(index.getTodos())).toEqual(['created during scan', 'fresh edit']);
});

test('a file deleted during startup is not resurrected by its pending read', async () => {
  const entry = file('deleted.md');
  const stale = deferred<string>();
  const { index, vault, emit } = setup([entry]);
  vault.cachedRead.mockReturnValueOnce(stale.promise);
  const initialization = index.initialize();
  await flushPromises();
  emit('delete', entry);
  stale.resolve('- [ ] deleted task');
  await initialization;
  expect(index.getTodos()).toEqual([]);
});

test('rename during startup invalidates the old read even when Obsidian mutates the same TFile', async () => {
  const entry = file('old.md');
  const stale = deferred<string>();
  const { index, vault, emit } = setup([entry]);
  vault.cachedRead.mockReturnValueOnce(stale.promise);
  const initialization = index.initialize();
  await flushPromises();
  entry.path = 'new.md';
  vault.cachedRead.mockResolvedValueOnce('- [ ] renamed contents');
  emit('rename', entry, 'old.md');
  await flushPromises();
  stale.resolve('- [ ] obsolete old contents');
  await initialization;
  expect(descriptions(index.getTodos())).toEqual(['renamed contents']);
  expect(index.getTodos().map((todo) => todo.sourceFilePath)).toEqual(['new.md']);
});

test('out-of-order modification reads cannot overwrite the newest file revision', async () => {
  const entry = file('note.md');
  const { index, vault, emit } = setup([entry]);
  await index.initialize();
  const first = deferred<string>();
  const second = deferred<string>();
  vault.cachedRead.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
  emit('modify', entry);
  emit('modify', entry);
  second.resolve('- [ ] newest');
  await flushPromises();
  first.resolve('- [ ] older');
  await flushPromises();
  expect(descriptions(index.getTodos())).toEqual(['newest']);
});

test('an obsolete initialization cannot publish results or mark the newer scan complete', async () => {
  const oldRead = deferred<string>();
  const newRead = deferred<string>();
  const { index, vault, listener } = setup([file('old.md')]);
  vault.cachedRead.mockReturnValueOnce(oldRead.promise).mockReturnValueOnce(newRead.promise);
  const first = index.initialize();
  await flushPromises();
  vault.getMarkdownFiles.mockReturnValue([file('new.md')]);
  const second = index.initialize();
  await flushPromises();
  const calls = listener.mock.calls.length;
  oldRead.resolve('- [ ] obsolete generation');
  await first;
  await jest.advanceTimersByTimeAsync(200);
  expect(index.isIndexing()).toBe(true);
  expect(index.getTodos()).toEqual([]);
  expect(listener).toHaveBeenCalledTimes(calls);
  newRead.resolve('- [ ] current generation');
  await second;
  expect(descriptions(index.getTodos())).toEqual(['current generation']);
  expect(index.isIndexing()).toBe(false);
  expect(vault.on).toHaveBeenCalledTimes(4);
});

test('changed date settings reindex without duplicate subscriptions and invalidate pending old reads', async () => {
  const entry = file('note.md');
  const stale = deferred<string>();
  const { index, vault, listener } = setup([entry]);
  vault.cachedRead.mockReturnValueOnce(stale.promise).mockResolvedValue('- [ ] current @23/10/2026');
  const initialization = index.initialize();
  await flushPromises();
  index.setSettings({ ...DEFAULT_SETTINGS, dateFormat: 'dd/MM/yyyy', dateTagFormat: '@%date%' });
  await flushPromises();
  expect(index.isIndexing()).toBe(false);
  expect(descriptions(index.getTodos())).toEqual(['current']);
  expect(index.getTodos()[0].actionDate?.toISODate()).toBe('2026-10-23');
  const calls = listener.mock.calls.length;
  stale.resolve('- [ ] obsolete #2026-01-01');
  await initialization;
  await jest.advanceTimersByTimeAsync(200);
  expect(descriptions(index.getTodos())).toEqual(['current']);
  expect(listener).toHaveBeenCalledTimes(calls);
  expect(vault.on).toHaveBeenCalledTimes(4);
});

test('dispose cancels queued notifications and prevents in-flight scan and event reads from publishing', async () => {
  const files = Array.from({ length: 17 }, (_, i) => file(`${i}.md`));
  const reads = files.map(() => deferred<string>());
  const liveRead = deferred<string>();
  const { index, vault, listener, emit } = setup(files);
  vault.cachedRead.mockImplementation((entry) => reads[files.indexOf(entry)].promise);
  const initialization = index.initialize();
  await flushPromises();
  reads.slice(0, 8).forEach((read) => read.resolve('- [ ] first batch'));
  await flushPromises();
  await jest.advanceTimersByTimeAsync(0);
  expect(vault.cachedRead).toHaveBeenCalledTimes(16);
  vault.cachedRead.mockReturnValueOnce(liveRead.promise);
  emit('modify', files[0]);
  await flushPromises();
  index.dispose();
  const snapshot = index.getTodos();
  const calls = listener.mock.calls.length;
  const readCalls = vault.cachedRead.mock.calls.length;
  reads.slice(8).forEach((read) => read.resolve('- [ ] obsolete scan'));
  liveRead.resolve('- [ ] obsolete event');
  await jest.advanceTimersByTimeAsync(500);
  await initialization;
  emit('create', file('after-disposal.md'));
  await flushPromises();
  expect(index.getTodos()).toEqual(snapshot);
  expect(listener).toHaveBeenCalledTimes(calls);
  expect(vault.cachedRead).toHaveBeenCalledTimes(readCalls);
  expect(vault.offref).toHaveBeenCalledTimes(4);
});

test('renaming markdown to a non-markdown extension removes old tasks without reading the attachment', async () => {
  const entry = file('note.md');
  const { index, vault, emit } = setup([entry]);
  await index.initialize();
  vault.cachedRead.mockClear();
  entry.path = 'note.txt';
  entry.extension = 'txt';
  emit('rename', entry, 'note.md');
  await flushPromises();
  expect(index.getTodos()).toEqual([]);
  expect(vault.cachedRead).not.toHaveBeenCalled();
});

test('startup skips queued files modified or deleted before their batch begins', async () => {
  const files = Array.from({ length: 10 }, (_, i) => file(`${i}.md`));
  const pending = deferred<string>();
  const { index, vault, emit } = setup(files);
  vault.cachedRead.mockImplementation((entry) => {
    if (files.indexOf(entry) < 8) return pending.promise;
    return Promise.resolve('- [ ] live modification');
  });
  const initialization = index.initialize();
  await flushPromises();
  emit('delete', files[8]);
  emit('modify', files[9]);
  await flushPromises();
  expect(descriptions(index.getTodos())).toEqual(['live modification']);
  pending.resolve('- [ ] initial task');
  await jest.runAllTimersAsync();
  await initialization;
  expect(vault.cachedRead.mock.calls.filter(([entry]) => entry === files[8])).toHaveLength(0);
  expect(vault.cachedRead.mock.calls.filter(([entry]) => entry === files[9])).toHaveLength(1);
  expect(index.getTodos()).toHaveLength(9);
  expect(index.getTodos().find((todo) => todo.sourceFilePath === '9.md')?.description).toBe('live modification');
});

test('settings loaded before startup apply to the first scan without creating an extra scan', async () => {
  const { index, vault } = setup([file('note.md')]);
  vault.cachedRead.mockResolvedValue('- [ ] configured @23/10/2026');
  index.setSettings({ ...DEFAULT_SETTINGS, dateFormat: 'dd/MM/yyyy', dateTagFormat: '@%date%' });
  expect(vault.getMarkdownFiles).not.toHaveBeenCalled();
  expect(vault.on).not.toHaveBeenCalled();
  await index.initialize();
  expect(vault.cachedRead).toHaveBeenCalledTimes(1);
  expect(index.getTodos()[0].actionDate?.toISODate()).toBe('2026-10-23');
});
