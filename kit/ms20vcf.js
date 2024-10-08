// source: https://github.com/magnusjonsson/microtracker
// A is lowpass input and output
// B is bandpass input (optional)
(_=>{
	let tanh = @KIT(fasttanh);
	//let tanh = Math.tanh;
	let state0=0,state1=0;
	return (A,B,omega,resonance) => {
		let r = resonance * (2-omega);
		let feed0, feed1, b, i;
		for (i = 0; i < A.length; i++) {
			b = B?B[i]:0;
			feed0 = A[i]   + b - state1*r;
			feed1 = state0 - b + state1*r;
			state0 += omega*(tanh(feed0)-tanh(state0));
			state1 += omega*(tanh(feed1)-tanh(state1));
			A[i] = state1;
		}
	};
})
