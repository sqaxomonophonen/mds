#!/usr/bin/env node

const lib = require('./lib_crunchlink');
function build(api) {
	lib.set_split("Z");

	const clean_html = s => s.replace(/<!--[\s\S]*?-->/g, ''); // remove HTML comments
	const clean_css  = s => s.replace(/\/\*[\s\S]*?\*\//g, ''); // remove CSS comments

	let [ css, css_pairs ] = lib.crunch("CSS",clean_css(api.read("dearplayer.css")),[
		"filter:drop-shadow(",
		"position:absolute;",
		"position:relative;",
		"cursor:pointer;",
		"border-radius:",
		"font-family:",
		"background:",
		"opacity:",
		"px #000",
		"height:",
		"margin",
		"width:",
		"color:",
		"right:",
		"left:",
		"100%",
		"0 0 ",
		");}",
		"px",
	]);

	let [ html, html_pairs ] = lib.crunch("HTML",clean_html(api.read("dearplayer.html")),[
		'<rect width="6" height="16" y="2" style="fill:$C" x="',
		'<path stroke="$C" stroke-width="1" fill="none" id="c',
		'<svg viewBox="0 0 ',
		'<polygon points="',
		'<div class="',
		'<div id="',
		'height="',
		'fill:$C"',
		'style="',
		'class="',
		'width="',
		"</div>",
		"</svg>",
		"canvas",
		"span",
		"0 0 ",
		'" ',
		'><',
		'="',
		'/>',
		'">',
		'16',
	]);

	let [ aw, aw_pairs ] = lib.crunch("JS/WORKLET", api.compile("dearplayer_audioworklet.js"), [
		'Processor',
		//'.length', // this is too common; handle via outer compressor?
		'this.',
		'port.'
	]);

	let [ player, player_pairs ] = lib.crunch("JS/MAIN", api.compile("dearplayer.js"), [
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

	// XXX I should probably resist the temptation to save a few chars by inlining
	// A0/A1/A2, but it has a higher risk of F being overwritten...
	src += "F=(s,p,x)=>{for(p=p.split('"+lib.get_split()+"');p.length;){x=p.pop();s=s.replaceAll(x[0],x.slice(1));}return s};";
	src += "A0=F(`<style>"+css+"</style>`,`"+css_pairs+"`);";
	src += "A1=F(`"+html+"`,`"+html_pairs+"`);";
	src += "A2=F(`"+aw+"`,`"+aw_pairs+"`);";
	src += "eval(F("+sqjson(player)+",`"+player_pairs+"`));";

	return src;
}


module.exports = {
	build: build,
};
