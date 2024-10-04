// source: https://github.com/magnusjonsson/microtracker
(_=>{
	let tanh = @KIT(fasttanh);
	//let tanh = Math.tanh;
	let p0=0,p1=0,p2=0,p3=0,p32=0,p33=0,p34=0;
	return (A, omega, resonance) => {
		const k = 4*resonance;
		let i,out;
		for (i = 0; i < A.length; i++) {
			out = p3*0.360891 + p32*0.417290 + p33*0.177896 + p34*0.0439725;

			p34 = p33;
			p33 = p32;
			p32 = p3;

			p0 += (tanh(A[i] - k*out) - tanh(p0))*omega;
			p1 += (tanh(p0)-tanh(p1))*omega;
			p2 += (tanh(p1)-tanh(p2))*omega;
			p3 += (tanh(p2)-tanh(p3))*omega;

			A[i] = out;
		}
	};
})
