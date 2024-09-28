const lib = require('./lib_crunchlink');
function build(api) {
	lib.set_split("Z");

	let [ aw, aw_pairs ] = lib.crunch("JS/WORKLET", api.compile("miniplayer_audioworklet.js"), [
		'Processor',
		'this.',
	]);

	let [ player, player_pairs ] = lib.crunch("JS/MAIN", api.compile("miniplayer.js"), [
		".innerHTML",
		"visibility",
		"Worklet",
		"button",
		".port.",
		"on",
	]);

	let src = "";

	src += "F=(s,p,x)=>{for(p=p.split('"+lib.get_split()+"');p.length;){x=p.pop();s=s.replaceAll(x[0],x.slice(1));}return s};";
	src += "A0=F(`"+aw+"`,`"+aw_pairs+"`);";
	src += "eval(F("+lib.single_quote_json(player)+",`"+player_pairs+"`));";

	console.log(src);

	return src;
}
module.exports = {
	build: build,
};
