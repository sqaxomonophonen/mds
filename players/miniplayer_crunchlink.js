const lib = require('./lib_crunchlink');
function build(api) {
	lib.set_split("Z");

	let [ aw, aw_pairs ] = lib.crunch("JS/WORKLET", api.compile("miniplayer_audioworklet.js"), [
		'Processor',
		//'.length', // this is too common; handle via outer compressor?
		'this.',
	]);

	let [ player, player_pairs ] = lib.crunch("JS/MAIN", api.compile("miniplayer.js"), [
		".create",
		".connect",
		".style.",
		".innerHTML",
		".on",
		//"new ", // probably not worth it
		//'.length', // this is too common; handle via outer compressor?
	]);

	function sqjson(o) {
		return "'"+JSON.stringify(o).slice(1,-1).replaceAll('\\"','"')+"'";
	}

	let src = "";

	src += "F=(s,p,x)=>{for(p=p.split('"+lib.get_split()+"');p.length;){x=p.pop();s=s.replaceAll(x[0],x.slice(1));}return s};";
	src += "A0=F(`"+aw+"`,`"+aw_pairs+"`);";
	src += "eval(F("+sqjson(player)+",`"+player_pairs+"`));";

	return src;
}
module.exports = {
	build: build,
};
