(_=>{
	let N_CHANNELS=2,
	CHUNK_FRAMES=256,
	N_CHUNKS=10000,
	push=P(@DEF(SR), N_CHANNELS, N_CHUNKS*CHUNK_FRAMES, "0000", "#a0a"),
	remaining=N_CHUNKS,
	X
	;

	let oversample_ratio = 5;
	let downsampler = @KIT(sinc_downsampler)(oversample_ratio,5,@KIT(kaiser_bessel)(1.5));
	let A = new Float32Array(CHUNK_FRAMES*oversample_ratio);
	let B = new Float32Array(CHUNK_FRAMES);

	const accbits = 24;
	let inc = (50*(1<<accbits) / (oversample_ratio * @DEF(SR)))|0;
	let acc = 0;

	//let filter = @KIT(moogvcf2)();
	//let filter = @KIT(moogvcf1)();
	let filter = @KIT(ms20vcf)();

	X = () => {
		for (let n = 0; n < 50; n++) {
			if (remaining-- <= 0) return;
			for (let i = 0; i < A.length; i++) {
				A[i] = ((acc / (1<<accbits)) - 0.5) * 1.8;
				acc = (acc + inc) & ((1<<accbits)-1);
			}
			inc++;
			//filter(A,(N_CHUNKS-remaining)/N_CHUNKS,3.5);
			//filter(A,(N_CHUNKS-remaining)/N_CHUNKS,0.8,0);
			//let AA = new Float32Array(A.length);
			filter(A,0,(N_CHUNKS-remaining)/N_CHUNKS,0.99);
			downsampler(A,B);
			let xs = new Float32Array(CHUNK_FRAMES*N_CHANNELS);
			for(let i = 0; i < CHUNK_FRAMES; i++) {
				xs[i*2]=xs[i*2+1]=B[i];
			}
			push(xs);
		}
		setTimeout(X,0);
	};
	X();
})();
