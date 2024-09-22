#!/usr/bin/env node

const path=require("path");
const fs=require("fs");
const assert = require('node:assert').strict;

function b252_digit_enc(digit) {
	assert(0 <= digit && digit < 252);
	return digit + (digit>(10-1)) + (digit>(13-2)) + (digit>(34-3)) + (digit>(92-4));
}

function b93_digit_enc(digit) {
	assert(0 <= digit && digit < 93);
	return 32 + digit + (digit>(34-33)) + (digit>(92-34));
}

const METHODS = [
	{ name: "Rules-breaking ISO-8859-1" , base: 252 , digits: 44 , bits: 351 , encode_digit: b252_digit_enc },
	{ name: "Standards-compliant ASCII" , base: 93  , digits: 13 , bits: 85  , encode_digit: b93_digit_enc  }
];

const get_method_id = (m) => "b"+(m.base)+"d"+(m.digits)+"n"+(m.bits);

if (process.argv.length !== 5) {
	console.log("Usage: "+path.basename(process.argv[1])+" <method> <input> <output>");
	console.log("");
	console.log("Converts binary file into ''text'' meant to be put into a double-quote string");
	console.log("in JavaScript inside a HTML <script> tag.");
	console.log("");
	console.log("Methods:");
	for (const m of METHODS) {
		const id = get_method_id(m);
		console.log("  ", id, "\t", m.name);
	}
	process.exit(1);
}

const [ method_id, input_path, output_path ] = process.argv.slice(2);

let method = null;
for (const m of METHODS) {
	if (get_method_id(m) === method_id) {
		method = m;
		break;
	}
}
if (method === null) {
	console.log("Invalid method: " + method_id);
	process.exit(1);
}

const input_data = fs.readFileSync(input_path);
let bit_array = [];
for (let i0 = 0; i0 < input_data.length; i0++) {
	const b = input_data[i0];
	for (let i1 = 0; i1 < 8; i1++) {
		bit_array.push((b>>i1)&1);
	}
}

let buffer = new Uint8Array(1<<20);
let bit_cursor = 0;
let byte_cursor = 0;

const BASE   = BigInt(method.base); 
const DIGITS = BigInt(method.digits);
const BITS   = BigInt(method.bits);

while (bit_cursor < bit_array.length) {
	let VAL = 0n;
	for (let BIT = 0n; BIT < BITS; BIT++) {
		if (bit_cursor < bit_array.length && bit_array[bit_cursor]) VAL |= 1n<<BIT;
		bit_cursor++;
	}
	for (let I = 0n; I < DIGITS; I++) {
		buffer[byte_cursor++] = method.encode_digit(Number(VAL % BASE));
		VAL /= BASE;
	}
}

assert((byte_cursor % method.digits) === 0);

fs.writeFileSync(output_path, buffer.slice(0,byte_cursor));
console.log(method_id, input_path, input_data.length, "=>", output_path, byte_cursor, "( efficiency:", input_data.length/byte_cursor, ")");
