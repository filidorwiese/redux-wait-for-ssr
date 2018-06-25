import typescript from 'rollup-plugin-typescript2'

export default [
  {
    input: 'src/wait-for.ts',
    output: {
      file: 'dist/wait-for.umd.js',
      name: 'WaitFor',
      format: 'umd',
      exports: 'named'
    },
    plugins: [
      typescript()
    ]
  },
  {
    input: 'src/wait-for.ts',
    output: {
      file: 'dist/wait-for.esm.js',
      name: 'WaitFor',
      format: 'esm'
    },
    plugins: [
      typescript()
    ]
  }
]
