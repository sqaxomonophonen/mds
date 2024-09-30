((ratio,n_zero_crossings,window_fn)=>{
	let fir_size = ratio * n_zero_crossings;
	let coef = new Float32Array(fir_size);
	for (let i = 0; i < fir_size; i++) {
		let x = (i*Math.PI)/ratio;
		coef[i] = (x==0 ? 1 : (Math.sin(x)/x)) * window_fn(i/(fir_size-1));
	}
	return coef;
})
