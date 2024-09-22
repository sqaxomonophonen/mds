#!/usr/bin/env node

const lib = require('./lib_crunchlink');

lib.set_split("Z");

const clean_html = s => s.replace(/<!--[\s\S]*?-->/g, ''); // remove HTML comments
const clean_css  = s => s.replace(/\/\*[\s\S]*?\*\//g, ''); // remove CSS comments

let [ css, css_pairs ] = lib.crunch("dearplayer.css",clean_css(lib.load("dearplayer.css")),[
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

let [ html, html_pairs ] = lib.crunch("dearplayer.html",clean_html(lib.load("dearplayer.html")),[
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

let [ aw, aw_pairs ] = lib.crunch("dearplayer_audioworklet.min.js",lib.load("dearplayer_audioworklet.min.js"),[
	'Processor',
	//'.length', // this is too common; handle via outer compressor?
	'this.',
	'port.'
]);

let [ player, player_pairs ] = lib.crunch("dearplayer.min.js",lib.load("dearplayer.min.js"),[
	".create",
	".connect",
	".style.",
	".innerHTML",
	".on",
	"new ",
	//'.length', // this is too common; handle via outer compressor?
]);

function sqjson(o) {
	return "'"+JSON.stringify(o).slice(1,-1).replaceAll('\\"','"')+"'";
}


// XXX I should probably resist the temptation to save a few chars by inlining
// A0/A1/A2, but it has a higher risk of F being overwritten...
console.log("F=(s,p,x)=>{for(p=p.split('"+lib.get_split()+"');p.length;){x=p.pop();s=s.replaceAll(x[0],x.slice(1));}return s};");
console.log("A0=F(`<style>"+css+"</style>`,`"+css_pairs+"`);");
console.log("A1=F(`"+html+"`,`"+html_pairs+"`);");
console.log("A2=F(`"+aw+"`,`"+aw_pairs+"`);");
//console.log("eval(F("+JSON.stringify(player)+",`"+player_pairs+"`));");
console.log("eval(F("+sqjson(player)+",`"+player_pairs+"`));");

