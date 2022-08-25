import Decimal from 'decimal.js'
import { LosslessNumber } from './LosslessNumber.js'
import { parseNumberAndBigInt } from './numberParsers.js'
import { parse } from './parse.js'
import { stringify } from './stringify.js'

// helper function to create a lossless number
function lln (value) {
  return new LosslessNumber(value);
}

// deepEqual objects compared as plain JSON instead of JavaScript classes
function expectDeepEqual(a, b) {
  expect(jsonify(a)).toEqual(jsonify(b));
}

// turn a JavaScript object into plain JSON
function jsonify (obj) {
  return JSON.parse(JSON.stringify(obj));
}

test('full JSON object', function () {
  let text = '{"a":2.3e100,"b":"str","c":null,"d":false,"e":[1,2,3]}';
  let expected = {a: lln('2.3e100'), b:'str', c: null, d: false, e:[lln(1), lln(2), lln(3)]};
  let parsed = parse(text);

  expect(jsonify(parsed)).toEqual(jsonify(expected));
});

test('object', function () {
  expect(parse('{}')).toEqual({});
  expect(parse('  { \n } \t ')).toEqual({});
  expect(parse('{"a": {}}')).toEqual({a: {}});
  expect(parse('{"a": "b"}')).toEqual({a: 'b'});
  expect(parse('{"a": 2}')).toEqual({a: lln(2)});
});

test('array', function () {
  expect(parse('[]')).toEqual([]);
  expect(parse('[{}]')).toEqual([{}]);
  expect(parse('{"a":[]}')).toEqual({a:[]});
  expect(parse('[1, "hi", true, false, null, {}, []]')).toEqual([lln(1), "hi", true, false, null, {}, []]);
});

test('number', function () {
  expect(parse('2.3e500').isLosslessNumber).toBe(true);
  expect(parse('123456789012345678901234567890').isLosslessNumber).toBe(true);
  expect(parse('23')).toEqual(lln('23'));
  expect(parse('0')).toEqual(lln('0'));
  expect(parse('0e+2')).toEqual(lln('0e+2'));
  expect(parse('0e+2').valueOf()).toEqual(0);
  expect(parse('0.0')).toEqual(lln('0.0'));
  expect(parse('-0')).toEqual(lln('-0'));
  expect(parse('2.3')).toEqual(lln(2.3));
  expect(parse('2300e3')).toEqual(lln('2300e3'));
  expect(parse('2300e+3')).toEqual(lln('2300e+3'));
  expect(parse('-2')).toEqual(lln('-2'));
  expect(parse('2e-3')).toEqual(lln('2e-3'));
  expect(parse('2.3e-3')).toEqual(lln('2.3e-3'));
});

test('LosslessNumber', function () {
  let str = '22222222222222222222';
  expectDeepEqual(parse(str), lln(str));

  let str2 = '2.3e+500';
  expectDeepEqual(parse(str2), lln(str2));

  let str3 = '2.3e-500';
  expectDeepEqual(parse(str3), lln(str3));
});

test('string', function () {
  expect(parse('"str"')).toEqual('str');
  expect(JSON.parse('"\\"\\\\\\/\\b\\f\\n\\r\\t"')).toEqual('"\\/\b\f\n\r\t');
  expect(parse('"\\"\\\\\\/\\b\\f\\n\\r\\t"')).toEqual('"\\/\b\f\n\r\t');
  expect(JSON.parse('"\\u260E"')).toEqual('\u260E');
  expect(parse('"\\u260E"')).toEqual('\u260E');
});

test('keywords', function () {
  expect(parse('true')).toEqual(true);
  expect(parse('false')).toEqual(false);
  expect(parse('null')).toEqual(null);
});

test('reviver - replace values', function () {
  let text = '{"a":123,"b":"str"}';

  let expected = {
    type: 'object',
    value: {
      a: {type: 'object', value: lln(123)},
      b: {type: 'string', value: 'str'}
    }
  };

  function reviver (key, value) {
    return {
      type: typeof value,
      value
    };
  }

  expect(parse(text, reviver)).toEqual(expected);
});

test('reviver - invoke callbacks with key/value and correct context', function () {
  let text = '{"a":123,"b":"str","c":null,"22":22,"d":false,"e":[1,2,3]}';

  let expected = [
    {
      context: { 22: 22, a: 123, b: 'str', c: null, d: false, e: [1, 2, 3] },
      key: '22', // ordered first
      value: 22
    },
    {
      context: { 22: 22, a: 123, b: 'str', c: null, d: false, e: [1, 2, 3] },
      key: 'a',
      value: 123
    },
    {
      context: { 22: 22, a: 123, b: 'str', c: null, d: false, e: [1, 2, 3] },
      key: 'b',
      value: 'str'
    },
    {
      context: { 22: 22, a: 123, b: 'str', c: null, d: false, e: [1, 2, 3] },
      key: 'c',
      value: null
    },
    {
      context: { 22: 22, a: 123, b: 'str', c: null, d: false, e: [1, 2, 3] },
      key: 'd',
      value: false
    },
    {
      context: [1, 2, 3],
      key: '0',
      value: 1
    },
    {
      context: [1, 2, 3],
      key: '1',
      value: 2
    },
    {
      context: [1, null, 3],
      key: '2',
      value: 3
    },
    {
      context: { 22: 22, a: 123, b: 'str', c: null, e: [1, null, 3] },
      key: 'e',
      value: [1,null,3]
    },
    {
      context: {'': { 22: 22, a: 123, b: 'str', c: null, e: [1, null, 3] }},
      key: '',
      value: { 22: 22, a: 123, b: 'str', c: null, e: [1, null, 3] }
    }
  ];

  // convert LosslessNumbers to numbers for easy comparison with native JSON
  function toRegularJSON(json) {
    return JSON.parse(stringify(json))
  }

  function reviver(key, value) {
    return key === 'd'
      ? undefined
      : key === '1'
        ? null
        : value
  }

  // validate expected outcome against reference implemenation JSON.parse
  let logsReference = [];
  JSON.parse(text, function (key, value) {
    logsReference.push({context:
        toRegularJSON(this),
      key,
      value
    });
    return reviver(key, value)
  });

  let logsActual = [];
  parse(text, function (key, value) {
    logsActual.push({
      context: toRegularJSON(this),
      key,
      value: toRegularJSON(value)
    });
    return reviver(key, value)
  });

  expect(logsReference).toEqual(expected);
  expect(logsActual).toEqual(expected);
});

test('correctly handle strings equaling a JSON delimiter', function () {
  expect(parse('""')).toEqual("");
  expect(parse('"["')).toEqual("[");
  expect(parse('"]"')).toEqual("]");
  expect(parse('"{"')).toEqual("{");
  expect(parse('"}"')).toEqual("}");
  expect(parse('":"')).toEqual(":");
  expect(parse('","')).toEqual(",");
});

test('reviver - revive a lossless number correctly', function () {
  let text = '2.3e+500';
  let expected = [
    {key: '', value: lln('2.3e+500')}
  ];
  let logs = [];

  parse(text, function (key, value) {
    logs.push({key, value});
    return value;
  });
  expectDeepEqual(logs, expected);
});

test('parse with a custom number parser creating bigint', () => {
  const json = parse('[123456789123456789123456789, 2.3, 123]', null, parseNumberAndBigInt)
  expect(json).toEqual([
    123456789123456789123456789n,
    2.3,
    123n
  ])
})

test('parse with a custom number parser creating Decimal', () => {
  const parseDecimal = value => new Decimal(value)

  const json = parse('[123456789123456789123456789,2.3,123]', null, parseDecimal)
  expect(json).toEqual([
    new Decimal('123456789123456789123456789'),
    new Decimal('2.3'),
    new Decimal('123')
  ])
})

test('throw exceptions', function () {
  expect(function () {parse('')}).toThrow(/Unexpected end of json string/);

  expect(function () {parse('{')}).toThrow(/Object key expected/);
  expect(function () {parse('{"a",')}).toThrow(/Colon expected/);
  expect(function () {parse('{a:2}')}).toThrow(/Object key expected/);
  expect(function () {parse('{"a":2,}')}).toThrow(/Object key expected/);
  expect(function () {parse('{"a" "b"}')}).toThrow(/Colon expected/);
  expect(function () {parse('{}{}')}).toThrow(/Unexpected characters/);

  expect(function () {parse('[')}).toThrow(/Unexpected end of json string/);
  expect(function () {parse('[2,')}).toThrow(/Unexpected end of json string/);
  expect(function () {parse('[2,]')}).toThrow(/Value expected/);

  expect(function () {parse('2.3.4')}).toThrow(/Syntax error in part ".4" \(char 3\)/);
  expect(function () {parse('2..3')}).toThrow(/Invalid number, digit expected \(char 2\)/);
  expect(function () {parse('2e3.4')}).toThrow(/Syntax error in part ".4" \(char 3\)/);
  expect(function () {parse('2e')}).toThrow(/Invalid number, digit expected \(char 2\)/);
  expect(function () {parse('-')}).toThrow(/Invalid number, digit expected \(char 1\)/);

  expect(function () {parse('"a')}).toThrow(/End of string expected/);
  expect(function () {parse('foo')}).toThrow(/Unknown symbol "foo"/);
  expect(function () {parse('"\\a"')}).toThrow(/Invalid escape character "\\a" /);
  expect(function () {parse('"\\u26"')}).toThrow(/Invalid unicode character/);
  expect(function () {parse('"\\uZ000"')}).toThrow(/Invalid unicode character/);
});