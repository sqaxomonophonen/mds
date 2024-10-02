const load = (api) => {
	return {
		assets: [],
		source: api.read("main.js"),
	};
}

module.exports = {
	dirname: __dirname,
	name: "0000",
	load: load,
};
