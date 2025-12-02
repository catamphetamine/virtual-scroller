// import json from 'rollup-plugin-json'
import commonjs from 'rollup-plugin-commonjs'
import resolve from 'rollup-plugin-node-resolve'
import { terser } from 'rollup-plugin-terser'

const resolveModules = resolve()

export default [
  {
    input: 'index.js',
    plugins: [
      resolveModules,
      commonjs(),
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
      resolveModules,
      commonjs(),
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
    // Legacy compatibility:
    //
    // Originally, the default export of the `virtual-scroller/react` subpackage
    // was only the `VirtualScroller` component, and there were no other exports.
    //
    // Later, `useVirtualScroller()` hook export was added.
    // In order to maintain legacy compatibility, the new exports shouldn't "break"
    // the existing environments that were using the old versions of the package.
    // This means that in non-ES6-import environments, any additional exports
    // should be added directly to the default `VirtualScroller` export.
    //
    // That's the reason why it uses "modules/react/VirtualScroller.js" file
    // as `input` here instead of "react/index.js".
    //
    input: 'modules/react/VirtualScroller.js',
    plugins: [
      resolveModules,
      commonjs(),
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
