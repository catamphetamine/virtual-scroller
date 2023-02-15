export default class ItemNotRenderedError extends Error {
	constructor({
		renderedElementIndex,
		renderedElementsCount,
		message
	}) {
		super(message || getDefaultMessage({ renderedElementIndex, renderedElementsCount }))
	}
}

function getDefaultMessage({
	renderedElementIndex,
	renderedElementsCount
}) {
	return `Element with index ${renderedElementIndex} was not found in the list of Rendered Item Elements in the Items Container of Virtual Scroller. There're only ${renderedElementsCount} Elements there.`
}