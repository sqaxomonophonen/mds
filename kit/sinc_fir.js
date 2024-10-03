((ratio,n_zero_crossings,window_fn)=>{
	let half_size = ratio*n_zero_crossings;
	let fir_size = 2*half_size - 1;
	let coef = new Float32Array(fir_size);
	for (let i = 0; i < fir_size; i++) {
		let x = ((i-half_size+1)*Math.PI)/ratio;
		coef[i] = ((i+1)%ratio==0) ? 0 : (x==0 ? 1 : (Math.sin(x)/x)) * window_fn(i/(fir_size-1));
	}
	return coef;
})
