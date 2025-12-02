// import type { MutableRefObject } from 'react'
import { useCallback } from 'react'

// use this hook when a React component receives a `ref` which it is supposed to "forward"
// and when it would also like to access that `ref`'s value in its code.
//
// ```js
// const FormWithAutoFocus = forwardRef((props, ref) => {
//   const duplicateRef = useRef()
//   const setRef = useMergeRefs<RefValueType>(ref, duplicateRef)
//
//   useEffect(() => {
//     duplicateRef.current.focus()
//   }, [])
//
//   return (
//     <Form ref={setRef} {...props}/>
//   )
// })
// ```
//
// export default function useMergeRefs<T extends MutableRefObject<any>>(ref1, ref2, ref3) {
export default function useMergeRefs(ref1, ref2, ref3, otherArgument) {
	if (otherArgument) {
		throw new Error('A maximum of 3 refs is supported')
	}

	const setRef = useCallback((instance) => {
		setRefValue(ref1, instance)
		setRefValue(ref2, instance)
		setRefValue(ref3, instance)
	}, [ref1, ref2, ref3])

	return setRef
}

function setRefValue(ref, instance) {
	if (ref) {
		if (typeof ref === 'function') {
			ref(instance)
		} else {
			ref.current = instance
		}
	}
}