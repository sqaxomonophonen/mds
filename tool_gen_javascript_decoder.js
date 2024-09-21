#!/usr/bin/env node

const path=require("path");
const fs=require("fs");
const assert = require('node:assert').strict;
const lib=require("./lib_b123n118");

if (process.argv.length !== 5) {
	console.log("Usage: "+path.basename(process.argv[1])+" <symtab.json> <output.prelude.bin> <output.decoder.js>");
	console.log("<symtab.json> comes from text2ransinput.js");
	process.exit(1);
}

const symtab = JSON.parse(fs.readFileSync(process.argv[2],"utf-8"));

let strings  = [];
let chars = [];
for (const def of symtab.defs) {
	if (def === null) {
		freqs.push(0);
		continue;
	}
	const [ str, freq ] = def;
	if (str.length > 1) {
		assert(chars.length === 0);
		strings.push(def);
	} else {
		const idx = str.charCodeAt(0)-32;
		assert(0 <= idx && idx < (128-1-32));
		chars[idx] = def;
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

let prelude = "";
for (let freq of freqs) {
	const s = 61;
	let v = freq;
	do {
		const d = v%s;
		v = (v/s)|0;
		let dd = d;
		if (v) dd += s;
		prelude += String.fromCharCode(lib.b123map[dd]);
		if (!v) break;
	} while(v);
}

fs.writeFileSync(process.argv[3], prelude);




let js = "";
const W = (line) => js+=(line+"\n");

W("eval((_=>{");
W("  let v,m,i,c=0,");
W("  tbl=[],");
W("  strs=\"" + strings.map(x=>x[0]).join("\x01") + "\".split(\"\x01\"),");
W("  ns=strs.length,");
W("  n=ns+95,");
W("  M=61,");
W("  start=[],freq=[]");
W("  ;");
W("  for(i=0;i<n;i++){");
W("    v=0;m=1;");
W("    while(1){");
W("      let d=Y();");
W("      v+=m*(d%M);");
W("      if(d<M) break;");
W("      m*=M;");
W("    }");
W("    start[i]=c;");
W("    freq[i]=m;");
W("    for(m=0;m<v;m++){");
W("      tbl[c++]=i;");
W("    }");
W("  }");
W("  c=\"\";");
W("  for(i=0;i<"+symtab.n_symbols+";i++){");
W("    m = tbl[X()];");
W("    c += m<ns ? strs[m] : String.fromCharCode(32+m-ns);");
W("    X(start[m],freq[m]);");
W("  }");
W("  return c;");
W("})());");

fs.writeFileSync(process.argv[4], js);
