import { TextPatternParser } from './TextPatternParser';

type PatternTestNames = 'single' | 'array' | 'null' | 'empty' | 'emptyArray';
type TestStringNames = 'none' | 'test' | 'test2' | 'empty' | 'null';

type ExpectedTestResults = {
    [P in PatternTestNames]: {
        [T in TestStringNames]: boolean;
    };
}

const PatternTests: {[P in PatternTestNames]: string | string[] | undefined | null} = {
    single: '#test',
    empty: '',
    array: ['#test', '#another_test', '',],
    emptyArray: [],
    null: null
}

const StringTests: {[T in TestStringNames]: string} = {
    none: 'This is a test string without any defined matches #notamatch',
    test: 'This is a test string with #test',
    test2: 'This string contains #another_test',
    empty: '',
    null: null
}

const TestsToRun: ExpectedTestResults = {
    single: {
        none: false,
        test: true,
        test2: false,
        empty: false,
        null: false
    },
    array: {
        none: false,
        test: true,
        test2: true,
        empty: false,
        null: false
    },
    null: {
        none: false,
        test: false,
        test2: false,
        empty: false,
        null: false
    },
    empty: {
        none: false,
        test: false,
        test2: false,
        empty: false,
        null: false
    },
    emptyArray: {
        none: false,
        test: false,
        test2: false,
        empty: false,
        null: false
    }
};

describe('TextTagParser Tests', () => {
    Object.keys(TestsToRun).forEach((patternName) => {
        Object.keys(StringTests).forEach((testStringName) => {
            const pn = patternName as PatternTestNames;
            const sn = testStringName as TestStringNames;
            test(
                `testing pattern ${patternName} with test string ${testStringName} - should be - ${TestsToRun[pn][sn]}`,
                () => {
                    const parser = new TextPatternParser(PatternTests[pn]);
                    const result = parser.HasMatch(StringTests[sn]);
                    expect(result).toEqual(TestsToRun[pn][sn]);
                }
            );
        });
    });
});