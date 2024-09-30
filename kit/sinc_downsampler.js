/*
creates a downsampler (A,B) that downsamples A into B.
the following must hold:
   A.length/ratio == B.length
*/
((ratio, n_zero_crossings,window_fn) => {
	let sinc_table = @KIT(sinc_fir)(ratio, n_zero_crossings, window_fn);
	let tail = new Float32Array(sinc_table.length);
	return (A,B) => {
		// TODO
	};
})
