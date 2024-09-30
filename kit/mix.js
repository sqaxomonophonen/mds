// mix(A,B,C,...) mixes B,C,... into A
(function(){
	let A = arguments[0];
	let Bs = [...arguments].slice(1);
	let i,j;
	let n_samples = A.length;
	let n_sources = Bs.length;
	if (n_sources == 0) return; // XXX remove?
	for (i=0;i<n_samples;i++) {
		for (j=0;j<n_sources;j++) {
			A[i] += Bs[j][i];
		}
	}
})
