/*
creates a downsampler (A,B) that downsamples A into B.

The following must hold:

  A.length/ratio === B.length
  Reason: it downsamples `n*ratio` samples into `n` samples.

  A.length >= (ratio*n_zero_crossings)
  Reason: the code is shorter/simpler when `tail` can be completely populated
  from `A`?

*/
((ratio, n_zero_crossings,window_fn) => {
	let sinc_table = @KIT(sinc_fir)(ratio, n_zero_crossings, window_fn);
	let n = sinc_table.length;
	let tail = new Float32Array(n);
	return (A,B) => {
		let i,j,sum;

		// first output value requires A-values from the past which are
		// stored in `tail`:
		sum=0;
		for (j=1;j<n;j++) sum += tail[n-j] * sinc_table[j];
		for (j=0;j<n;j++) sum += A[j] * sinc_table[j];
		B[0] = sum;

		// the remaining output values can calculated without any "edge
		// cases" (literally?)
		for (i=1;i<B.length;i++) {
			sum=0;
			for (j=-n+1;j<n;j++) sum += A[i*n+j] * sinc_table[Math.abs(j)];
			B[i] = sum;
		}

		// remember the last A-values for next call
		tail.set(A.slice(A.length - tail.length));
	};
})
