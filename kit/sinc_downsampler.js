/*
creates a downsampler (A,B) that downsamples A into B.
*/
((ratio, n_zero_crossings,window_fn) => {
	let fir = @KIT(sinc_fir)(ratio, n_zero_crossings, window_fn);
	let nf = fir.length;
	let tail = new Float32Array(nf);

	return (A,B) => {
		let n0 = n_zero_crossings*2-1;
		let i,j,k,sum;
		for (i=0;i<=n0;i++) {
			sum=0;
			for (j=0;j<nf;j++) {
				k=i*ratio+j-nf;
				//if (!(-nf <= k && k < A.length)) throw new Error("BOUNDS(0)");
				sum += (k >= 0 ? A[k] : tail[nf+k]) * fir[j];
			}
			B[i]=sum;
		}
		for (;i<B.length;i++) {
			sum=0;
			for (j=0;j<nf;j++) {
				//if (!(0 <= (i*ratio+j-nf) && (i*ratio+j-nf) < A.length)) throw new Error("BOUNDS(1)");
				sum += A[i*ratio+j-nf] * fir[j];
			}
			B[i]=sum;
		}

		tail.set(A.slice(A.length-nf));
	};
})
