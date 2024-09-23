const assert = require('node:assert').strict;
const fs = require('fs');

let G_SPLIT = null;

function set_split(split) {
	G_SPLIT = split;
}
function get_split() {
	if (G_SPLIT === null) throw new Error("missing set_split() call");
	return G_SPLIT;
}

function crunch(what, orig, prefixes) {
	let tokens = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789~@";
	let split_pos = tokens.indexOf(get_split());
	if (split_pos >= 0) {
		tokens = tokens.slice(0,split_pos) + tokens.slice(split_pos+1);
	}
	assert(tokens.indexOf(get_split()) === -1);

	let w = orig;
	w = w.replaceAll("\n","");
	let next_token = (() => {
		let is_valid = (token) => w.indexOf(token) === -1;
		if (!is_valid(get_split())) throw new Error("source contains split-char; please remove it, or set_split() with a different split-char");
		let isl = 0;
		return () => {
			for (;;) {
				if ((isl++) < tokens.length) {
					const token = tokens[isl-1];
					if (is_valid(token)) return token;
				} else {
					throw new Error("XXX ran out of characters!"); // try maybe "@"?
				}
			}
		};
	})();
	let pairs = [];
	let ratio;
	let prev_ratio = 1;
	const get_ratio = _=>(w.length + 2 + pairs.join(get_split()).length) / orig.length;

	for (let prefix of prefixes) {
		let token = next_token();
		pairs.push(token+prefix);
		w=w.replaceAll(prefix,token);
		ratio = get_ratio();
		if (ratio > prev_ratio) {
			console.error("WARNING: prefix does not seem to compress: " + prefix)
			console.error("Bad ratio change:", prev_ratio, "=>", ratio);
		}
		prev_ratio = ratio;
	}
	console.error(what, "compression:", ratio, "( without dictionary:" , w.length/orig.length, ")");
	return [w, pairs.join(get_split())];
}

const clean_html = s => s.replace(/<!--[\s\S]*?-->/g, ''); // remove HTML comments
const clean_css  = s => s.replace(/\/\*[\s\S]*?\*\//g, ''); // remove CSS comments

module.exports = {
	set_split,
	get_split,
	crunch,
	clean_html,
	clean_css,
};
