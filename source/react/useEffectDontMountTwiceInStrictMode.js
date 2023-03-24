import { useRef, useCallback } from 'react'

// A workaround for a React bug when `useInsertionEffect()` doesn't run twice on mount
// in "strict" mode unlike `useEffect()` and `useLayoutEffect()` do.
// https://github.com/facebook/react/issues/26320
export default function useEffectDontMountTwiceInStrictMode(useEffect, handler, dependencies) {
  if (!Array.isArray(dependencies)) {
    throw new Error('Dependencies argument must be an array')
  }

  const { onEffect } = useEffectStatus()
  const { onChange } = usePrevousValue(dependencies)

  useEffect(() => {
    const { isInitialRun } = onEffect()
    const previousDependencies = onChange(dependencies)
    if (isInitialRun || !isShallowEqualArrays(previousDependencies, dependencies)) {
      const cleanUpFunction = handler()
      if (typeof cleanUpFunction === 'function') {
        throw new Error('An effect can\'t return a clean-up function when used with `useEffectDontMountTwiceInStrictMode()` because the clean-up function won\'t behave correctly in that case')
      }
    }
  }, dependencies)
}

function useEffectStatus() {
  const hasMounted = useRef(false)

  const onEffect = useCallback(() => {
    const wasAlreadyMounted = hasMounted.current
    hasMounted.current = true
    return {
      isInitialRun: !wasAlreadyMounted
    }
  }, [])

  return {
    onEffect
  }
}

function usePrevousValue(value) {
  const prevValue = useRef(value)

  const onChange = useCallback((value) => {
    const previousValue = prevValue.current
    prevValue.current = value
    return previousValue
  }, [])

  return {
    onChange
  }
}

function isShallowEqualArrays(a, b) {
  if (a.length !== b.length) {
    return false
  }
  let i = 0
  while (i < a.length) {
    if (a[i] !== b[i]) {
      return false
    }
    i++
  }
  return true
}