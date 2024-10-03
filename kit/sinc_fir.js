((ratio,n_zero_crossings,window_fn)=>{
	let half_size = ratio*n_zero_crossings;
	let fir_size = 2*half_size - 1;
	let coef = new Float32Array(fir_size);
	let sum = 0;
	let j;
	for (let i = 0; i < fir_size; i++) {
		j = (i-half_size+1);
		let x = (j*Math.PI)/ratio;
		coef[i] = (x==0 ? 1 : ((i+1)%ratio==0) ? 0 : (Math.sin(x)/x)) * window_fn(j/half_size);
		sum += coef[i];
	}
	for (let i = 0; i < fir_size; i++) coef[i] /= sum;
	return coef;
})
