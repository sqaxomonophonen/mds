const load = (api) => {
	const assets = [
	];
	return {
		assets: assets,
		source: api.read("song33.js"),
	};
}

module.exports = {
	dirname: __dirname,
	name: "1 (one?)",
	load: load,
};
