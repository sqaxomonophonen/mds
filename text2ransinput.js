#!/usr/bin/env node

const path=require("path");
const fs=require("fs");
const assert = require('node:assert').strict;

if (process.argv.length !== 7) {
	console.log("Usage: "+path.basename(process.argv[1])+" <scale bits> <symboldefs.json> <input text> <output symtab.json> <output symlist.txt>");
	console.log("   <scale bits>          Number of symbol frequency bits, typically 8-14");
	console.log("   <symbodefs.json>      Path to JSON list of symbol definitions (see: javascript_symboldefs.json)");
	console.log("   <input text>          Input text to analyze and turn into symbol list");
	console.log("   <output.symtab.json>  JSON output: symbol count and list of [<string>,<freq>] pairs");
	console.log("   <output.symlist.txt>  ransencode.c input (start/freq pairs)");
	process.exit(1);
}

const scale_bits = parseInt(process.argv[2],10);
if (!(1 <= scale_bits && scale_bits <= 16)) throw new Error("invalid scale bits");
const symbol_defs = JSON.parse(fs.readFileSync(process.argv[3]));
const input = fs.readFileSync(process.argv[4], "utf-8");

let symbol_stats = [];
let symbol_list = [];
let cursor = 0;
let max_symbol_index = 0;
let stripcc = false;
for (const def of symbol_defs) {
	if (typeof def === "object" && def.pragma) {
		switch (def.pragma) {
		case "stripcc": stripcc=true; break;
		default: throw new Error("unhandled pragma: " + def.pragma);
		}
	}
}
while (cursor < input.length) {
	while (stripcc && input.charCodeAt(cursor) < 32 && cursor < input.length) cursor++;
	if (cursor >= input.length) break;
	let symbol_index = 0;
	let str = null;
	for (const def of symbol_defs) {
		if (typeof def === "string") {
			const n = def.length;
			if (input.slice(cursor,cursor+n) === def) {
				str = def;
				cursor += n;
				break;
			}
			symbol_index++;
		} else if (typeof def === "object") {
			if (def.pragma === "stripcc") {
				assert(stripcc);
			} else if (def.expand === "ascii") {
				symbol_index += input.charCodeAt(cursor);
				str = input[cursor];
				cursor++;
				break;
			} else {
				throw new Error("invalid object");
			}
		} else {
			throw new Error("invalid entry");
		}
	}
	if (str === null) throw new Error("XXX");
	symbol_list.push(symbol_index);
	if (symbol_stats[symbol_index] === undefined) {
		symbol_stats[symbol_index] = {
			str:str,
			hits:0,
			weight:0,
			freq:0,
		};
	}
	symbol_stats[symbol_index].hits++;
	symbol_stats[symbol_index].weight += symbol_stats[symbol_index].str.length;
	if (symbol_index > max_symbol_index) max_symbol_index = symbol_index;
}


// d'hondt method
let divisors = [];
for (let vote = 0; vote < (1 << scale_bits); vote++) {
	best_q = undefined;
	best_symidx = undefined;
	for (let symidx = 0; symidx <= max_symbol_index; symidx++) {
		const stats = symbol_stats[symidx];
		if (!stats) continue;
		if (divisors[symidx] === undefined) divisors[symidx] = 1;
		const q = stats.weight / divisors[symidx];
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
assert(sum === (1 << scale_bits));


/*
//console.log(JSON.stringify(symbol_stats));
for (let i = 0; i < symbol_stats.length; i++) {
	console.log(i, symbol_stats[i]);
}
*/

let brief_symbol_def = symbol_stats.map((st) => [st.str,st.freq]);

symboltxt = "";
for (let e of symbol_list) {
	const st = symbol_stats[e];
	symboltxt += st.start + " " + st.freq + "\n";
}

// write symtab.json
fs.writeFileSync(process.argv[5], JSON.stringify({
	n_symbols: symbol_list.length,
	defs: brief_symbol_def.filter(x=>x!==null),
	scale_bits: scale_bits,

}));

// write symlist.txt
fs.writeFileSync(process.argv[6], symboltxt);
