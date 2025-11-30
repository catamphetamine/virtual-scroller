// import type { MutableRefObject } from 'react'
import { useCallback, useRef } from 'react'

// When a React component receives a `ref` which it is supposed to "forward"
// and when it would like to also read that `ref` in its internal implementation,
// this `useForwardedRef()` hook could be used to get read access to such "forwarded" ref
// inside the component's internal implementation.
//
// ```js
// const FormWithAutoFocus = forwardRef((props, ref) => {
//   const { setRef, internalRef } = useForwardedRef<RefValueType>(ref)
//
//   useEffect(() => {
//     internalRef.current.focus()
//   }, [])
//
//   return (
//     <Form ref={setRef} {...props}/>
//   )
// })
// ```
//
// export default function useForwardedRef<T extends MutableRefObject<any>>(ref) {
export default function useForwardedRef(ref) {
	const internalRef = useRef() // as T

	const setRef = useCallback((instance) => {
		internalRef.current = instance
		if (ref) {
			if (typeof ref === 'function') {
				ref(instance)
			} else {
				ref.current = instance
			}
		}
	}, [ref])

	return { setRef, internalRef }
}
