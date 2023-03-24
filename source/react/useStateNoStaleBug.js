import { useRef, useState, useCallback } from 'react'

// This hook fixes any weird intermediate inconsistent/invalid/stale state values.
// https://github.com/facebook/react/issues/25023#issuecomment-1480463544
export default function useStateNoStaleBug(initialState) {
  // const latestValidState = useRef(initialState)
  const latestWrittenState = useRef(initialState)
  const [_state, _setState] = useState(initialState)

  // Instead of dealing with a potentially out-of-sync (stale) state value,
  // simply use the correct latest one.
  const state = latestWrittenState.current

  /*
  let state
  if (_state === latestWrittenState.current) {
    state = _state
    latestValidState.current = _state
  } else {
    // React bug detected: an out-of-sync (stale) state value received.
    // Ignore the out-of-sync (stale) state value.
    state = latestValidState.current
  }
  */

  const setState = useCallback((newState) => {
    if (typeof newState === 'function') {
      throw new Error('Function argument of `setState()` function is not supported by this hook')
    }
    latestWrittenState.current = newState
    _setState(newState)
  }, [])

  return [state, setState]
}