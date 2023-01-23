export default function fillArray(array, getItem) {
	let i = 0
	while (i < array.length) {
		array[i] = getItem(i)
		i++
	}
	return array
}