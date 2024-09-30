// try alpha=1.5?
((alpha) => {
	let bessel_I0 = (x) => {
		let k=0,s=0,t=1;
		do {
			s += t;
			t *= (x*x) / (4*(k+1)**2);
			k++;
		} while(Math.abs(t) > 1e-8 * Math.abs(s));
	};
	return (x) => bessel_I0(Math.PI*alpha*Math.sqrt(1-(x*x))) / bessel_I0(Math.PI*alpha);
})
