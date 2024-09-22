// The rANS decoder was ported into JS from rans_byte.h (functions ported:
// RansDecInit(), RansDecGet() and RansDecAdvance()). rans_byte.h is also used
// in the rANS encoder (tool_ransencode.c). `pull_byte` is the function
// `Y("data")` returns in b93n85decoder.js and b252n351decoder.js. `scale_bits`
// is the number of frequency bits.
X=(scale_bits,pull_byte) => {
	// The original C code uses ops like `|`, `<<` and `>>` which can cause
	// problems in JavaScript because values are treated as /signed/ 32-bit
	// integers. I converted potential troublemakers to `*`, `/` and `+`.
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
