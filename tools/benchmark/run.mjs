import { dirname } from 'path'
import { fileURLToPath } from 'url'
import { readFileSync } from 'fs';
import { parse, stringify } from '../../src/index.ts';
import Benchmark from 'benchmark'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const json = JSON.parse(readFileSync(__dirname + '/largefile.json', 'utf-8'));
const text = JSON.stringify(json);

const suite = new Benchmark.Suite()
suite
  .add('        JSON.parse    ', () => JSON.parse(text))
  .add('LosslessJSON.parse    ', () => parse(text))
  .add('        JSON.stringify', () => JSON.stringify(json))
  .add('LosslessJSON.stringify', () => stringify(json))
  .on('cycle', function (event) {
    console.log(String(event.target))
  })
  .on('complete', function () {
  })
  .run()