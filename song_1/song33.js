(_=>{
	let N_CHANNELS=2,
	CHUNK_FRAMES=256,
	N_CHUNKS=1000,
	push=P(@DEF(SR), N_CHANNELS, N_CHUNKS*CHUNK_FRAMES, "sinetest", "#fb1"),
	remaining=N_CHUNKS,
	X,c=0,
	pi2=2*Math.PI,
	dt=(440/@DEF(SR))*pi2
	;

	X = () => {
		for (let n = 0; n < 50; n++) {
			if (remaining-- <= 0) return;
			let xs = new Float32Array(CHUNK_FRAMES*N_CHANNELS);
			for(let i = 0; i < CHUNK_FRAMES; i++) {
				xs[i*2]=xs[i*2+1]=Math.sin(c);
				c += dt;
			}
			push(xs);
			while (c > pi2) c -= pi2;
		}
		setTimeout(X,0);
	};
	X();
})();
