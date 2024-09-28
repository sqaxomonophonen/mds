(_=>{
	let N_CHANNELS=2,
	CHUNK_FRAMES=256,
	N_CHUNKS=10000,
	push=P(@DEF(SR), N_CHANNELS, N_CHUNKS*CHUNK_FRAMES, "song3 - aks", "#fb1"),
	remaining=N_CHUNKS,
	phi_left=0,
	phi_right=0,
	dphi_left = 0.1,
	dphi_right = 0.11,
	X
	;

	// XXX resolver tests
	/*
	console.log("PIIIII", @DEF(PI)); // shared global constant due to 2+ hits
	console.log("PIIIII", @DEF(PI));
	console.log("rate?", @DEF(SR)); // inlined
	console.log("gain", @KIT(gain_node)); // kit/gain_node.js
	*/

	let welle0 = @KIT(hexwave)(32,16);

	let tmp = new Float32Array(CHUNK_FRAMES);
	let dt = 0.001;
	X = () => {
		for (let n = 0; n < 50; n++) {
			if (remaining-- <= 0) return;
			welle0.g(tmp,dt);
			let xs = new Float32Array(CHUNK_FRAMES*N_CHANNELS);
			for(let i = 0; i < CHUNK_FRAMES; i++) {
				xs[i*2]=xs[i*2+1]=tmp[i];
			}
			dt *= 1.0005;
			push(xs);
		}
		setTimeout(X,0);
	};
	X();
})();
