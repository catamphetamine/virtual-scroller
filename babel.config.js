module.exports = {
	"presets": [
		"@babel/preset-env",
		"@babel/preset-react"
	],

	"plugins": [
		["@babel/plugin-transform-for-of", { loose: true }],
		"@babel/plugin-proposal-object-rest-spread",
		"@babel/plugin-proposal-class-properties"
	],

	"env": {
		"es6": {
			"presets": [
				["@babel/preset-env", { modules: false }]
			]
		},
		"test": {
			"plugins": [
				"babel-plugin-istanbul"
			]
		}
	}
}