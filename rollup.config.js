// import json from 'rollup-plugin-json'
// import commonjs from 'rollup-plugin-commonjs'
// import resolve from 'rollup-plugin-node-resolve'
import { terser } from 'rollup-plugin-terser'

// const resolveModules = resolve({
//   only: ['lodash']
// })

export default [
  {
    input: 'index.js',
    plugins: [
      // resolveModules,
      // commonjs(),
      // json(),
      terser()
    ],
    output: {
      format: 'umd',
      name: 'VirtualScroller',
      file: 'bundle/virtual-scroller.js',
      sourcemap: true
    }
  },
  {
    input: 'dom/index.js',
    plugins: [
      // resolveModules,
      // commonjs(),
      // json(),
      terser()
    ],
    output: {
      format: 'umd',
      name: 'VirtualScroller',
      file: 'bundle/virtual-scroller-dom.js',
      sourcemap: true
    }
  },
  {
    input: 'react/index.js',
    plugins: [
      // resolveModules,
      // commonjs(),
      // json(),
      terser()
    ],
    external: [
      'react',
      'prop-types'
    ],
    output: {
      format: 'umd',
      name: 'VirtualScroller',
      file: 'bundle/virtual-scroller-react.js',
      sourcemap: true,
      globals: {
        'react': 'React',
        'prop-types': 'PropTypes'
      }
    }
  }
]
