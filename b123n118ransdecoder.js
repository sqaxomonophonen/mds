// base-123 118-bit decoder => rANS decoder

// See/use b123n118encode.js and ransencode.c to build strings that this code
// can decode.

// RE: "base-123 118-bit":
//   Math.log2(123**17) = 118.02274659076708
// Input is base-123 in the sense that all 128 ASCII characters are allowed
// except for these 5 which would otherwise have to be escaped (unwanted
// because it requires 2+ bytes for 1 digit):
//   name   esc    idx
//   NUL   "\x00"    0 (technically valid in JS, but not in HTML?)
//   LF    "\n"     10
//   CR    "\r"     13
//   "     "\""     34
//   \     "\\"     92
// Input is read 17 characters at a time, or: one 17-digit base-123 value at a
// time. This is just enough to siphon 118 bits, which are buffered and
// converted into output bytes. So in terms of data density it's only:
//   base-122.88597591741355  (2**(118/17)
// "17" was chosen to minimize the fractional part. The first digit count that
// offers a smaller fractional part is "52":
//   Math.log2(123**52)=361.0107542776405
// To see if it makes a positive difference try changing "17n" to "52n" and
// "118n" to "361n"

// The rANS decoder was ported into JS from rans_byte.h (functions ported:
// RansDecInit(), RansDecGet() and RansDecAdvance()). rans_byte.h is also used
// in the rANS encoder (ransencode.c)

// Usage:
//   Y=Y("... your data here ...");
//   X=X(n_scale_bits,Y);
//   X()            => returns cumulative frequency for current symbol (corresponds to RansDecGet())
//   X(start,freq)) => advance to next symbol (corresponds to RansDecAdvance())

Y=(input) => {
	let input_index = 0;
	return _ => ((code) => code-1-(code>10)-(code>13)-(code>34)-(code>92))(input.charCodeAt(input_index++));
};
X=(scale_bits,pull_base123) => {
	let i,
	byte_buffer = [],
	bit_buffer = [],
	input_index = 0,
	tmp0,
	byt,
	pull_byte = _=>{
		if (!byte_buffer.length) {
			tmp0 = 0n;
			for (i=0n; i<17n; i++) { // XXX(MAGIC)(stride=17)
				tmp0 += BigInt(pull_base123()) * (123n ** i); // XXX(MAGIC)(base=123)
			}
			for (i=0n; i<118n; i++) bit_buffer.push((tmp0 >> i) & 1n); // XXX(MAGIC)(bits/stride=118)
			while (bit_buffer.length > 7) {
				tmp0 = 0;
				for (i=0; i<8; i++) tmp0 |= bit_buffer.shift() ? 1<<i : 0;
				byte_buffer.push(tmp0);
			}
		}
		return byte_buffer.shift();
	},
	mask = (1<<scale_bits)-1,
	rans_state=0
	;

	// rANS decoder
	for(let i=0;i<32;i+=8) rans_state += pull_byte() << i;
	return (start,freq)=>{
		if (start === undefined) return rans_state & mask;
		// carefully rewritten to avoid negative values (e.g. in JS:
		// 1<<31===-2147483648)
		//  - (rans_state>>scale_bits)       =>   ((rans_state/(mask+1))|0)
		//  - (rans_state<<8) | pull_byte()  =>   (rans_state * 256) + pull_byte()
		// NOTE (rans_state & mask) is safe
		rans_state = freq * ((rans_state/(mask+1))|0) + (rans_state & mask) - start;
		while (rans_state < (1<<23)) rans_state = (rans_state * 256) + pull_byte();
	}
}
