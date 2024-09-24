#!/usr/bin/env node

const ujs = require("uglify-js");
const fs = require("fs");
const path = require("path");
const assert = require("node:assert").strict;
const child_process = require("child_process");

const PREFIX = "song_";
const SCALE_BITS = 14; // TODO configurable?
const JS_LONG_SYMBOL_SPLITTER = "Z"; // must not be found in any of the long symbols
const MINIFY = true; // TODO configurable? but something fails at runtime with MINIFY=false; haven't figured it out yet

process.chdir(__dirname);

const ID_WIDTH = 10;

function rpad(s,n) {
	while (s.length < n) s=s+" ";
	return s;
}

function load_song(id) {
	const p = path.join(PREFIX+id, "mod.js");
	if (!fs.existsSync(p)) return null;
	const mod = require("./"+p);
	mod.id = id;
	return mod;
}

function must_load_song(id) {
	const mod = load_song(id);
	if (mod === null) {
		console.error("No such song: " + id);
		process.exit(1);
	}
	return mod;
}

const player_path = (filename) => path.join("players", filename);
const codec_path = (filename) => path.join("codecs", filename);


let codecs_text = "";
let codec_map = {};
[
	{
		id:"b252",
		desc:"Rules-breaking, base-252, 44 digits => 351 bits, rANS stream",
		decoder: codec_path("b252n351decoder.js"),
		html_header: '<meta charset="ISO-8859-1">',
		base: 252,
		digits: 44,
		bits: 351,
		encode_digit: (digit) => {
			assert(0 <= digit && digit < 252);
			return digit + (digit>(10-1)) + (digit>(13-2)) + (digit>(34-3)) + (digit>(92-4));
		},
	},
	{
		id:"b93",
		desc:"Standards-compliant/printable, base-93, 13 digits => 85 bits, rANS stream",
		decoder: codec_path("b93n85decoder.js"),
		html_header: '<!DOCTYPE html><title>-</title>',
		base: 93,
		digits: 13,
		bits: 85,
		encode_digit: (digit) => {
			assert(0 <= digit && digit < 93);
			return 32 + digit + (digit>(34-33)) + (digit>(92-34));
		},
	},
].map(e => {
	codecs_text += " " + rpad(e.id,ID_WIDTH) + e.desc + "\n";
	codec_map[e.id] = e;
});


let player_map = {};
let players_text = "";
[
	{
		id:"mini",
		desc:"Miniplayer: for 32k builds",
		crunchlink: player_path("miniplayer_crunchlink.js"),
	},
	{
		id:"dear",
		desc:"Dearplayer: nice GUI but still small",
		crunchlink: player_path("dearplayer_crunchlink.js"),
	},
].map(e => {
	players_text += " " + rpad(e.id,ID_WIDTH) + e.desc + "\n";
	player_map[e.id] = e;
});

function usage() {
	process.stdout.write("Usage: " + path.basename(process.argv[1]) + " <song id> <codec> <player>\n");
	process.stdout.write("Songs:\n");
	for (let p of fs.readdirSync(".")) {
		let st = fs.statSync(p);
		if (!st.isDirectory()) continue;
		if (p.indexOf(PREFIX) !== 0) continue;
		const mod = load_song(p.slice(PREFIX.length));
		if (mod === null) continue;
		process.stdout.write(" " + rpad(mod.id, ID_WIDTH) + mod.name + "\n");
		//process.stdout.write("Songs:\n");
		//console.log(mod);
	}
	process.stderr.write("Codecs:\n" + codecs_text);
	process.stderr.write("Players:\n" + players_text);
	process.exit(1);
}

if (process.argv.length < 5) usage();
const [ arg_song_id, arg_codec, arg_player ] = process.argv.slice(2);

const song = must_load_song(arg_song_id);

const codec = codec_map[arg_codec];
const player = player_map[arg_player];

if (!codec) {
	console.error("No such codec: " + arg_codec);
	process.exit(1);
}

if (!player) {
	console.error("No such player: " + arg_player);
	process.exit(1);
}

const read_text = (path) => fs.readFileSync(path, "utf-8");

function minify(source, opt) {
	opt = opt || {};
	const mopts = {
		mangle: true,
		compress: {},
	};
	if (opt.expression) mopts.expression = true;
	const s = ujs.minify(source, mopts).code;
	assert(s !== undefined, "BAD SOURCE: " + source);
	return s;
}

function compile(source) {
	return MINIFY ? minify(source) : source;
	//return MINIFY ? minify(source) : source.replaceAll("\n","").replaceAll("\r","").replaceAll("\t","");
}

function compile_expression(source) {
	return MINIFY ? minify(source,{expression:true}) : source;
}

function compile_path(p) {
	assert(p);
	return compile(read_text(p));
}

const out = song.load({
	read: (p) => read_text(path.join(song.dirname,p)),
});

const i2id = (() => {
	const alphabet = "abcdefghijklmnopqrstuvwxyz0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
	const n = alphabet.length;
	return (index) => {
		assert(index >= 0);
		for (let n_digits = 1; n_digits <= 3; n_digits++) {
			if (index >= (n**n_digits)) continue;
			let s = "";
			let ri = index;
			for (let i = 0; i < n_digits; i++) {
				s += alphabet[ri % n];
				ri = (ri/n)|0;
			}
			return s;
		}
		throw new Error("BAD INDEX");
	};
})();

const i2Zid = (index) => "Z"+i2id(index);

const strip_js_comments = (src) => src.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');

function enumerate_tags(source) {
	let cursor = 0;
	let tags = [];
	for (;;) {
		let at = source.slice(cursor).indexOf("@");
		if (at === -1) break;
		at += cursor;
		let p0 = source.slice(at).indexOf("(");
		assert(p0 != -1);
		p0 += at;
		let p1 = source.slice(p0).indexOf(")");
		assert(p1 != -1);
		p1 += p0;

		const typ   = source.slice(at+1,p0);
		const body = source.slice(p0+1,p1);
		//const key = source.slice(at,p1+1);
		tags.push([typ,body,at,p1+1])

		cursor = p1;
	}
	return tags;
}

const mk_tag_key = (tuple) => tuple[0] + "\x00" + tuple[1];

const mk_kit_path = (kit) => path.join("kit", kit+".js");

function resolve(source) {
	let rec0, rec0kit;
	let visited_kits = {};
	let key_hits = {};
	let key_tag_map = {};
	rec0 = (source) => {
		source = strip_js_comments(source);
		const tags = enumerate_tags(source);
		for (const tag of tags) {
			const key = mk_tag_key(tag);
			key_tag_map[key] = tag;
			if (key_hits[key] === undefined) key_hits[key] = 0;
			key_hits[key]++;
			if (tag[0] === "KIT") {
				rec0kit(tag[1]);
			}
		}
	};
	rec0kit = (kit) => {
		if (visited_kits[kit]) return;
		visited_kits[kit] = true;
		rec0(read_text(mk_kit_path(kit)));
	};
	rec0(source);

	let common_key_pairs = [];
	let do_inline_key = {};
	for (const key of Object.keys(key_hits)) {
		const hits = key_hits[key];
		if (hits === 1) {
			do_inline_key[key] = true;
		} else {
			assert(hits > 1);
			common_key_pairs.push([key, hits]);
		}
	}

	// stable sort by hits, so that most commonly used globals get the
	// shorter names
	common_key_pairs.sort((a,b) => {
		const d0 = b[1]-a[1];
		if (d0 !== 0) return d0;
		return (a[0]>b[0]) - (a[0]<b[0]);
	});

	const common_keys = common_key_pairs.map(x=>x[0]);

	// assign shared identifier to keys with more than one instance
	let common_key_shared_ident={}, seq=0;
	for (const key of common_keys) {
		common_key_shared_ident[key] = i2Zid(seq++);
	}

	let rec1, rec1tag;
	kit_source_cache = {};
	rec1 = (source) => {
		source = strip_js_comments(source);
		const tags = enumerate_tags(source);
		tags.reverse();
		for (const tag of tags) {
			const key = mk_tag_key(tag);
			const [typ,body,start,end] = tag;
			let replacement = common_key_shared_ident[key];
			if (replacement === undefined) {
				assert(do_inline_key[key]);
				replacement = rec1tag(tag);
			}
			assert(replacement);
			source = source.slice(0,start) + replacement + source.slice(end);
		}
		return source;
	};
	rec1tag = (tag) => {
		const [typ,body,start,end] = tag;
		switch (typ) {
		case "DEF": {
			const ident = body;
			switch (ident) {
			case "PI": return Math.PI.toFixed(5);
			case "SR": return (44100).toString();
			default: assert(!"unhandled ident: " + ident);
			}
		}	break;
		case "KIT": {
			const kit = body;
			if (!kit_source_cache[kit]) {
				kit_source_cache[kit] = rec1(read_text(mk_kit_path(kit)));
			}
			const source = kit_source_cache[kit];
			assert(source);
			return source;
		}	break;
		case "PCM": {
			const ident = body;
			assert(!"TODO PCM " + body);
		}	break;
		case "PAT": {
			const ident = body;
			assert(!"TODO PAT " + ident);
		}	break;
		case "GEN": {
			const ident = body;
			assert(!"TODO GEN " + ident);
		}	break;
		default: assert(!"unhandled typ:" + typ);
		}
	};

	let r = "";
	for (const key of common_keys) {
		r += common_key_shared_ident[key] + "=" + rec1tag(key_tag_map[key]) + ";\n";
	}
	r += rec1(source);

	return r;
}

let song_source = resolve(out.source);
song_source = compile(song_source);
//console.log(song_source);

const decoder_source = compile_path(codec.decoder);

const player_crunchlink = require("./" + player.crunchlink);

const player_src = player_crunchlink.build({
	read: (filename) => read_text(player_path(filename)),
	compile: (filename) => compile_path(player_path(filename)),
});

function text2rans(stripcc, long_symbols, input) {
	if (!(1 <= SCALE_BITS && SCALE_BITS <= 16)) throw new Error("invalid scale bits");

	let symbol_stats = [];
	let symbol_list = [];
	let cursor = 0;
	let max_symbol_index = 0;
	while (cursor < input.length) {
		while (stripcc && input.charCodeAt(cursor) < 32 && cursor < input.length) cursor++;
		if (cursor >= input.length) break;
		let symbol_index = 0;

		let str = null;

		// long symbol
		for (let i = 0; i < long_symbols.length; i++) {
			const symbol = long_symbols[i];
			const n = symbol.length;
			if (input.slice(cursor,cursor+n) === symbol) {
				str = symbol;
				cursor += n;
				symbol_index = i;
				break;
			}
		}

		// single letter symbol
		if (str === null) {
			symbol_index = long_symbols.length + input.charCodeAt(cursor);
			str = input[cursor];
			cursor++;
		}


		assert(str !== null);

		symbol_list.push(symbol_index);
		if (symbol_stats[symbol_index] === undefined) {
			symbol_stats[symbol_index] = {
				str:str,
				hits:0,
				freq:0,
			};
		}
		symbol_stats[symbol_index].hits++;
		if (symbol_index > max_symbol_index) max_symbol_index = symbol_index;
	}


	// d'hondt method
	let divisors = [];
	for (let vote = 0; vote < (1 << SCALE_BITS); vote++) {
		best_q = undefined;
		best_symidx = undefined;
		for (let symidx = 0; symidx <= max_symbol_index; symidx++) {
			const stats = symbol_stats[symidx];
			if (!stats) continue;
			if (divisors[symidx] === undefined) divisors[symidx] = 1;
			const q = stats.hits / divisors[symidx];
			if (best_q === undefined || q > best_q) {
				best_q = q;
				best_symidx = symidx;
			}
		}
		assert(best_symidx !== undefined);
		symbol_stats[best_symidx].freq++;
		divisors[best_symidx]++;
	}

	let sum = 0;
	for (let st of symbol_stats) {
		if (!st) continue
		st.start = sum;
		sum += st.freq;
	}
	assert(sum === (1 << SCALE_BITS));

	/*
	//console.log(symbol_stats);
	//console.log(JSON.stringify(symbol_stats));
	for (let i = 0; i < symbol_stats.length; i++) {
		console.log(i, symbol_stats[i]);
	}
	*/

	let brief_symbol_def = symbol_stats.map((st) => [st.str,st.freq]); // NOTE: .map() skips "undefined"
	//console.log(brief_symbol_def);

	rans_ranges_txt = "";
	for (let e of symbol_list) {
		const st = symbol_stats[e];
		rans_ranges_txt += st.start + " " + st.freq + "\n";
	}

	console.log(symbol_list.length, "symbols from", input.length, "bytes");

	return {
		n_symbols: symbol_list.length,
		sym_freq_pairs: brief_symbol_def.filter(x=>x!==null),
		rans_ranges_txt: rans_ranges_txt,
	};
}

const js_long_symbols = [
	"Float32Array(",
	"gargergaergargarg",
	".length",
	"Math.",
	"null",
	"for(",
	"let ",
	"var ",
	"if(",
	"100",
	"=>",
	"&&",
	"==",
	"+=",
	"-=",
	"++",
	");",
];

function js2rans(input) {
	return text2rans(true, js_long_symbols, input);
}

function rr2bin(rr) {
	const prg = "tool/ransencode";
	if (!fs.existsSync(prg)) {
		console.error(prg + ": not found; see top of " + prg + ".c for how to compile it");
		process.exit(1);
	}
	const child = child_process.spawnSync(prg, [SCALE_BITS.toString()], {
		input: rr,
		encoding: 'binary',
	});
	assert(child.status === 0, "program execution failed (" + child.stderr + ")");
	console.log(prg + ": " + child.stderr);
	const out = child.stdout;
	assert(child.stderr.indexOf(out.length + " bytes") >= 0, "above ransencode message did not contain expected '<N> bytes' string");
	return out;
}

let stage1_source = player_src + song_source;
const rans = js2rans(stage1_source);
const rans_bin = rr2bin(rans.rans_ranges_txt);

const u8arr_to_str = (u8arr) => Array.from(u8arr).map(x=>String.fromCharCode(x)).join("");

function make_bootstrap(n_symbols, sym_freq_pairs) {
	let strings  = [];
	let chars = [];
	for (const pair of sym_freq_pairs) {
		assert(pair !== null);
		// if (pair === null) { freqs.push(0); continue; }
		const [ str, freq ] = pair;
		if (str.length > 1) {
			assert(chars.length === 0);
			strings.push(pair);
		} else {
			const idx = str.charCodeAt(0)-32;
			assert(0 <= idx && idx < (128-1-32));
			chars[idx] = pair;
		}
	}

	let freqs = [];
	for (const def of strings) freqs.push(def[1]);
	for (let i = 0; i < (128-1-32); i++) {
		const def = chars[i];
		if (def) {
			freqs.push(def[1]);
		} else {
			freqs.push(0);
		}
	}

	let prelude = new Uint8Array(1<<20);
	let cursor = 0;
	for (let freq of freqs) {
		let v = freq;
		do {
			const d = v&0x7f;
			v = v>>7;
			let dd = d;
			if (v) dd |= 0x80;
			prelude[cursor++] = dd;
			if (!v) break;
		} while(v);
	}
	prelude = prelude.slice(0,cursor);

	let js = "";
	const W = (line) => js+=(line+"\n");

	assert(strings.map(x=>x[0]).join("").indexOf(JS_LONG_SYMBOL_SPLITTER) === -1);

	W("eval((_=>{");
	//W("console.log((_=>{");
	W("  let v,m,i,c=0,");
	W("  tbl=[],");
	W("  strs=\"" + strings.map(x=>x[0]).join(JS_LONG_SYMBOL_SPLITTER) + "\".split(\""+JS_LONG_SYMBOL_SPLITTER+"\"),");
	W("  ns=strs.length,");
	W("  n=ns+95,");
	W("  M=128,");
	W("  start=[],freq=[]");
	W("  ;");
	W("  for(i=0;i<n;i++){");
	W("    v=0;m=1;");
	W("    while(1){");
	W("      let d=Y();");
	W("      v+=m*(d&127);");
	W("      if(d<M) break;");
	W("      m*=M;");
	W("    }");
	W("    start[i]=c;");
	W("    freq[i]=v;");
	W("    for(m=0;m<v;m++){");
	W("      tbl[c++]=i;");
	W("    }");
	W("  }");
	W("  c=\"\";");
	W("  X=X("+SCALE_BITS+",Y);");
	W("  for(i=0;i<"+n_symbols+";i++){");
	W("    m = tbl[X()];");
	W("    c += m<ns ? strs[m] : String.fromCharCode(32+m-ns);");
	W("    X(start[m],freq[m]);");
	W("  }");
	W("  return c;");
	W("})());");

	console.log("prelude:", prelude.length, "bytes");

	return {
		prelude: u8arr_to_str(prelude),
		js: js,
	};
}

function bin_to_js_str(input) {
	let bit_array = [];
	for (let i0 = 0; i0 < input.length; i0++) {
		const b = input.charCodeAt(i0);
		for (let i1 = 0; i1 < 8; i1++) {
			bit_array.push((b>>i1)&1);
		}
	}

	let buffer = new Uint8Array(1<<20);
	let bit_cursor = 0;
	let byte_cursor = 0;

	const BASE   = BigInt(codec.base);
	const DIGITS = BigInt(codec.digits);
	const BITS   = BigInt(codec.bits);

	while (bit_cursor < bit_array.length) {
		let VAL = 0n;
		for (let BIT = 0n; BIT < BITS; BIT++) {
			if (bit_cursor < bit_array.length && bit_array[bit_cursor]) VAL |= 1n<<BIT;
			bit_cursor++;
		}
		for (let I = 0n; I < DIGITS; I++) {
			buffer[byte_cursor++] = codec.encode_digit(Number(VAL % BASE));
			VAL /= BASE;
		}
	}

	assert((byte_cursor % codec.digits) === 0);
	buffer = buffer.slice(0,byte_cursor)
	console.log(codec.id, input.length, "=>", buffer.length, "( efficiency:", input.length/byte_cursor, ")");
	return u8arr_to_str(buffer);
}

const bootstrap = make_bootstrap(rans.n_symbols, rans.sym_freq_pairs);

let txtish = bin_to_js_str(bootstrap.prelude + rans_bin);
let html_source = "";
html_source += codec.html_header;
html_source += "<script>";
html_source += decoder_source;
html_source += "Y=Y(\"" + txtish + "\");";
html_source += compile_path(codec_path("ransdecoder.js"));
html_source += compile(bootstrap.js);
html_source += "</script>";

const html_path = "__build." + arg_song_id + ".html";
fs.writeFileSync(html_path, html_source, "binary");
console.log("wrote", html_path, html_source.length, "bytes");
