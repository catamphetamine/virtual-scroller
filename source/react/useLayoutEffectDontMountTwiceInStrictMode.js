import { useLayoutEffect } from 'react'

import useEffectDontMountTwiceInStrictMode from './useEffectDontMountTwiceInStrictMode.js'

// A workaround for a React bug when `useInsertionEffect()` doesn't run twice on mount
// in "strict" mode unlike `useEffect()` and `useLayoutEffect()` do.
// https://github.com/facebook/react/issues/26320
export default function useLayoutEffectDontMountTwiceInStrictMode(handler, dependencies) {
  return useEffectDontMountTwiceInStrictMode(useLayoutEffect, handler, dependencies)
}