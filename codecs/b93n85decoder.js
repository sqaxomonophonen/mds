// decoder for ascii base-93, 85 bits per 13 characters
Y=(input) => {
	let
	input_index = 0,
	byte_buffer = [],
	bit_buffer = [],
	i, code, tmp0;
	return _=>{
		if (!byte_buffer.length) {
			tmp0 = 0n;
			for (i=0n; i<13n; i++) {
				code = input.charCodeAt(input_index++);
				tmp0 += BigInt(code-32-(code>34)-(code>92)) * (93n ** i);
			}
			for (i=0n; i<85n; i++) bit_buffer.push((tmp0 >> i) & 1n);
			while (bit_buffer.length > 7) {
				tmp0 = 0;
				for (i=0; i<8; i++) tmp0 |= bit_buffer.shift() ? 1<<i : 0;
				byte_buffer.push(tmp0);
			}
		}
		return byte_buffer.shift();
	};
};
