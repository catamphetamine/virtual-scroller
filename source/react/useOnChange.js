import { useRef } from 'react'

export default function useOnChange(value, onChange) {
	const previousValueRef = useRef(value)
	const previousValue = previousValueRef.current
	previousValueRef.current = value

	if (value !== previousValue) {
		onChange(value, previousValue)
	}
}