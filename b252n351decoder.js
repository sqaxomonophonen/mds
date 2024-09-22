// decoder for iso-8859-1 base-252 stream, 351 bits per 44 characters

// 450ch
Y=(input) => {
	let
	input_index = 0,
	byte_buffer = [],
	bit_buffer = [],
	map = {},
	i, code, tmp0, tmp1;

	// map that helps decoding the [0x80;0x9f] range, i.e. the C1 control
	// characters. See:
	// https://html.spec.whatwg.org/multipage/parsing.html#numeric-character-reference-end-state
	i=124;
	for (code of [8364,,8218,402,8222,8230,8224,8225,710,8240,352,8249,338,,381,,,8216,8217,8220,8221,8226,8211,8212,732,8482,353,8250,339,,382,376]) {
		map[code] = i++;
		// map[undefined] is also set, but `i++` is important, and the
		// code below doesn't index map[undefined]
	}

	return _=>{
		if (!byte_buffer.length) {
			tmp0 = 0n;
			for (i=0n; i<44n; i++) {
				code = input.charCodeAt(input_index++);
				// NUL is mapped to 65533 / U+FFFD
				tmp0 += BigInt(code==65533 ? 0 : map[code] ? map[code] : code - (code>10) - (code>13) - (code>34) - (code>92)) * (252n ** i);
			}
			for (i=0n; i<351n; i++) bit_buffer.push((tmp0 >> i) & 1n);
			while (bit_buffer.length > 7) {
				tmp0 = 0;
				for (i=0; i<8; i++) tmp0 |= bit_buffer.shift() ? 1<<i : 0;
				// not shorter: for (i=0; i<8; i++) tmp0 |= 1<<(bit_buffer.shift()|0);
				byte_buffer.push(tmp0);
			}
		}
		return byte_buffer.shift();
	};
};

/*
// 483ch
Y=(input) => {
	let
	map = ((i,j,m) => {
		m={};
		j=124;
		for (i of [8364,,8218,402,8222,8230,8224,8225,710,8240,352,8249,338,,381,,,8216,8217,8220,8221,8226,8211,8212,732,8482,353,8250,339,,382,376]) {
			if (i) m[i] = j;
			j++;
		}
		return m;
	})(),
	input_index = 0,
	byte_buffer = [],
	bit_buffer = [],
	i, code, tmp0, tmp1;
	return _=>{
		if (!byte_buffer.length) {
			tmp0 = 0n;
			for (i=0n; i<44n; i++) {
				code = input.charCodeAt(input_index++);
				tmp0 += BigInt(code==65533 ? 0 : map[code] ? map[code] : code - (code>10) - (code>13) - (code>34) - (code>92)) * (252n ** i);
			}
			for (i=0n; i<351n; i++) bit_buffer.push((tmp0 >> i) & 1n);
			while (bit_buffer.length > 7) {
				tmp0 = 0;
				for (i=0; i<8; i++) tmp0 |= bit_buffer.shift() ? 1<<i : 0;
				// not shorter: for (i=0; i<8; i++) tmp0 |= 1<<(bit_buffer.shift()|0);
				byte_buffer.push(tmp0);
			}
		}
		return byte_buffer.shift();
	};
};
*/

/*
//536ch
Y=(input) => {
	let
	input_index = 0,
	byte_buffer = [],
	bit_buffer = [],
	i, code, tmp0, tmp1;
	return _=>{
		if (!byte_buffer.length) {
			tmp0 = 0n;
			for (i=0n; i<44n; i++) {
				code = input.charCodeAt(input_index++);
				tmp1 = {
					65533 : 0   ,
					8364  : 124 ,
					8218  : 126 ,
					402   : 127 ,
					8222  : 128 ,
					8230  : 129 ,
					8224  : 130 ,
					8225  : 131 ,
					710   : 132 ,
					8240  : 133 ,
					352   : 134 ,
					8249  : 135 ,
					338   : 136 ,
					381   : 138 ,
					8216  : 141 ,
					8217  : 142 ,
					8220  : 143 ,
					8221  : 144 ,
					8226  : 145 ,
					8211  : 146 ,
					8212  : 147 ,
					732   : 148 ,
					8482  : 149 ,
					353   : 150 ,
					8250  : 151 ,
					339   : 152 ,
					382   : 154 ,
					376   : 155
				}[code];
				tmp0 += BigInt(tmp1 !== undefined ? tmp1 : code - (code>10) - (code>13) - (code>34) - (code>92)) * (252n ** i);
			}
			for (i=0n; i<351n; i++) bit_buffer.push((tmp0 >> i) & 1n);
			while (bit_buffer.length > 7) {
				tmp0 = 0;
				for (i=0; i<8; i++) tmp0 |= bit_buffer.shift() ? 1<<i : 0;
				byte_buffer.push(tmp0);
			}
		}
		return byte_buffer.shift();
	};
};
*/
