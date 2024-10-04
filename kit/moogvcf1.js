// original: https://www.musicdsp.org/en/latest/Filters/25-moog-vcf-variation-1.html
// by paul.kellett@maxim.abel.co.uk July 2000

// A: input/output
// fc: filter [0;1]
// res: resonance [0;1]
// select: integer [0;3] that selects between [lp,hp0,hp1,bp]
(_=>{
	let b0=0,b1=0,b2=0,b3=0,b4=0;
	return (A,fc,res,select) => {
		let t1,t2,input;
		let q = 1 - fc;
		let p = fc + 0.8 * fc * q;
		let f = 2*p - 1;
		q = res * (1 + 0.5 * q * (1 - q + 5.6 * q * q));
		for (i=0; i < A.length; i++) {
			input = A[i];
			input -= q * b4; //feedback
			t1 = b1;
			b1 = (input + b0) * p - b1 * f;
			t2 = b2;
			b2 = (b1 + t1) * p - b2 * f;
			t1 = b3;
			b3 = (b2 + t2) * p - b3 * f;
			b4 = (b3 + t1) * p - b4 * f;
			b4 = b4 - b4*b4*b4 * 0.166667; //clipping
			b0 = input;
			A[i] = [
				b4, // lp
				input-b4, // hp0
				(input-3*(b3-b4))-b4, // hp1
				3*(b3-b4) // bp
			][select];
		}
	};
})
