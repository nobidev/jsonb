import terser from '@rollup/plugin-terser'

export default {
  input: './lib/esm/index.js',
  output: {
    name: 'LosslessJSON',
    file: 'lib/umd/jsonb.js',
    format: 'umd',
    compact: true,
    sourcemap: true,
    plugins: [terser()]
  }
}
