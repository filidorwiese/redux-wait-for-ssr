import typescript from 'rollup-plugin-typescript2'
import commonjs from 'rollup-plugin-commonjs'

export default {
  input: 'src/wait-for.ts',
  output: {
    file: 'dist/wait-for.js',
    name: 'WaitFor',
    format: 'es'
  },
  plugins: [
    typescript(),
    commonjs()
  ]
}
