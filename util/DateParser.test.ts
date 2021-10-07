import { DateParser } from './DateParser';

test('initializing the date parser without the date token', () => {
  expect(() => new DateParser('something else', 'yyyy-MM-dd')).toThrow('Tag format must include the %date% token.');
});

test('initializing the date parser with an invalid date format', () => {
  const dateParser = new DateParser('%date%', 'bogus');
  const contents = `This is a string that contains a date: 2020-02-16.`;
  const date = dateParser.parseDate(contents);
  expect(date).toBeUndefined();
});

test('extracting a date in a valid, simple format', () => {
  const dateParser = new DateParser(DateParser.DateToken, 'yyyy-MM-dd');
  const contents = `This is a string that contains a date: 2021-02-16.`;
  const date = dateParser.parseDate(contents);
  expect(date.day).toEqual(16);
  expect(date.month).toEqual(2);
  expect(date.year).toEqual(2021);
});

test('removing a date in a valid, simple format', () => {
  const dateParser = new DateParser(DateParser.DateToken, 'yyyy-MM-dd');
  const contents = `This is a string that contains a date: 2021-02-16.`;
  const contentsWithoutDate = dateParser.removeDate(contents);
  expect(contentsWithoutDate).toEqual("This is a string that contains a date: .");
});

test('only the first date is extracted', async () => {
  const dateParser = new DateParser(DateParser.DateToken, 'yyyy-MM-dd');
  const contents = `This is a string that contains not one date: 2021-02-16 but two: 2020-04-28.`;
  const date = dateParser.parseDate(contents);
  expect(date.day).toEqual(16);
  expect(date.month).toEqual(2);
  expect(date.year).toEqual(2021);
});

test('trying to extract a date that is not there', () => {
  const dateParser = new DateParser(DateParser.DateToken, 'yyyy-MM-dd');
  const contents = `This is a string that does not contain a date.`;
  const date = dateParser.parseDate(contents);
  expect(date).toBeUndefined();
});

test('extracting a date if the tag format contains date special regex characters', async () => {
  const dateParser = new DateParser(`[[${DateParser.DateToken}]]`, 'yyyy-MM-dd');
  const contents = `This is a string that contains a date: [[2021-02-16]] in a more complex format.`;
  const date = dateParser.parseDate(contents);
  expect(date.day).toEqual(16);
  expect(date.month).toEqual(2);
  expect(date.year).toEqual(2021);
});

test('extracting a date if the tag format contains date format tokens', () => {
  const dateParser = new DateParser(`Due:${DateParser.DateToken}`, 'yyyy-MM-dd');
  const contents = `A very custom tag. Due:2021-02-16.`;
  const date = dateParser.parseDate(contents);
  expect(date.day).toEqual(16);
  expect(date.month).toEqual(2);
  expect(date.year).toEqual(2021);
});
