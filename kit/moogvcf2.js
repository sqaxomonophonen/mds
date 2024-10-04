// original: https://www.musicdsp.org/en/latest/Filters/26-moog-vcf-variation-2.html
// "fc = cutoff, nearly linear [0,1] -> [0, fs/2]"
// "res = resonance [0, 4] -> [no resonance, self-oscillation]"
// only a low-pass filter
(_=>{
	let out1=0,out2=0,out3=0,out4=0,in1=0,in2=0,in3=0,in4=0;
	return (A,fc,res) => {
		const f = fc * 1.16;
		const ff = f*f;
		const ffff = ff*ff*0.35013;
		const fb = res * (1 - 0.15 * ff);
		const k = 0.3;
		const f1 = (1-f);
		let i,input;
		for (i=0; i < A.length; i++) {
			input = A[i];
			// someone on musicdsp suggested adding distortion in
			// the feedback:
			//input -= Math.tanh(out4 * fb * 1.5);
			input -= out4 * fb;
			input *= ffff;
			out1 = input + k*in1 + f1*out1;  // Pole 1
			out2 = out1  + k*in2 + f1*out2;  // Pole 2
			out3 = out2  + k*in3 + f1*out3;  // Pole 3
			out4 = out3  + k*in4 + f1*out4;  // Pole 4
			[in1,in2,in3,in4,A[i]]  = [input,out1,out2,out3,out4];
		}
	};
})
