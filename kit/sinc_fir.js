((ratio,n_zero_crossings,window_fn)=>{
	let fir_size = ratio * n_zero_crossings;
	let coef = new Float32Array(fir_size);
	for (let i = 0; i < fir_size; i++) {
		let x = (i*Math.PI)/ratio;
		// NOTE: `(i%ratio==0)?0:` ensures that zero crossings are true
		// zeroes instead of "not quite zero" (..e-17-ish). The only
		// benefit ought to be fewer denormals (denormals are bad for
		// performance)
		coef[i] = (i%ratio==0) ? 0 : (x==0 ? 1 : (Math.sin(x)/x)) * window_fn(i/(fir_size-1));
	}
	return coef;
})
