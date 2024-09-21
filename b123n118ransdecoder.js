// base-123 118-bit decoder => rANS decoder

// See/use tool_b123n118encode.js and tool_ransencode.c to build strings that
// this code can decode.

// RE: "base-123 118-bit":
//   Math.log2(123**17) = 118.02274659076708
// Input is base-123 in the sense that all 128 ASCII characters are allowed
// except for these 5 which would otherwise have to be escaped (unwanted
// because it requires 2+ bytes for 1 digit):
//   name   esc    idx
//   NUL   "\x00"    0 (valid in JS, but not in HTML?)
//   LF    "\n"     10
//   CR    "\r"     13
//   "     "\""     34
//   \     "\\"     92
// Input is read 17 characters at a time, or: one 17-digit base-123 value at a
// time. This is just enough to siphon 118 bits, which are buffered and
// converted into output bytes. So in terms of data density it's only:
//   base-122.88597591741355  (2**(118/17))
// "17" was chosen to minimize the fractional part. The first digit count that
// offers a smaller fractional part is "52":
//   Math.log2(123**52)=361.0107542776405
// To see if it makes a noticeable difference try changing "17n" to "52n" and
// "118n" to "361n"

// The rANS decoder was ported into JS from rans_byte.h (functions ported:
// RansDecInit(), RansDecGet() and RansDecAdvance()). rans_byte.h is also used
// in the rANS encoder (tool_ransencode.c)

// Usage:
//   Y=Y("... your data here ...");
//   X=X(n_scale_bits,Y);
//   X()            => returns cumulative frequency for current symbol (corresponds to RansDecGet())
//   X(start,freq)) => advance to next symbol (corresponds to RansDecAdvance())

// base-123 118-bit => byte stream decoder. `input` length must be a multiple
// of 17. returns a "pull_byte()" function that returns the next byte in the
// stream when called.
Y=(input) => {
	let
	input_index = 0,
	byte_buffer = [],
	bit_buffer = [],
	i, code, tmp0;
	return _=>{
		if (!byte_buffer.length) {
			tmp0 = 0n;
			for (i=0n; i<17n; i++) { // XXX(MAGIC)(stride=17)
				code = input.charCodeAt(input_index++);
				tmp0 += BigInt(code-1-(code>10)-(code>13)-(code>34)-(code>92)) * (123n ** i); // XXX(MAGIC)(base=123)
			}
			for (i=0n; i<118n; i++) bit_buffer.push((tmp0 >> i) & 1n); // XXX(MAGIC)(bits/stride=118)
			while (bit_buffer.length > 7) {
				tmp0 = 0;
				for (i=0; i<8; i++) tmp0 |= bit_buffer.shift() ? 1<<i : 0;
				byte_buffer.push(tmp0);
			}
		}
		return byte_buffer.shift();
	};
};

// rANS decoder; `pull_byte` is what `Y()` returns. `scale_bits` is the number
// of frequency bits
X=(scale_bits,pull_byte) => {
	// the bit-wise operations in JS work as /signed/ 32-bit integer
	// operations, e.g. 1<<31 = -2147483648; expressions that could produce
	// negative values were rewritten to avoid this; shifts are turned into
	// multiplications or divisions; bitwise-or is turned into addition.
	let
	mask = (1<<scale_bits)-1,
	rans_state=0,
	i;
	for(i=1;i<(1<<25);i*=256) rans_state += pull_byte()*i; // rewritten: used "<<" and "|"
	return (start,freq)=>{
		if (start === undefined) return rans_state & mask;
		rans_state = freq * ((rans_state/(mask+1))|0) + (rans_state & mask) - start; // rewritten: used "rans_state>>scale_bits"
		while (rans_state < (1<<23)) rans_state = (rans_state * 256) + pull_byte(); // rewritten: used "rans_state<<8" and "|"
	}
}
