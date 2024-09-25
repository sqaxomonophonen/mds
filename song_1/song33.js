(_=>{
	let
	N_CHANNELS=2,
	CHUNK_FRAMES=@DEF(SR)/10,
	N_CHUNKS=1000,
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

	console.log("WELLE0");
	let welle0 = @KIT(welle)(32,16);
	console.log("WELLE1", welle0);

	X = () => {
		if (remaining-- <= 0) return;
		let xs = new Float32Array(CHUNK_FRAMES*N_CHANNELS);
		let p = 0;
		for (let i = 0; i < CHUNK_FRAMES; i++) {
			xs[p++] = 0.9 * Math.sin(phi_left);
			xs[p++] = 0.9 * Math.sin(phi_right);
			phi_left += dphi_left;
			phi_right += dphi_right;
			dphi_left += 1.1e-7;
			dphi_right += 1e-7;
			while (phi_left > 2*Math.PI) phi_left -= 2*Math.PI;
			while (phi_right > 2*Math.PI) phi_right -= 2*Math.PI;
		}
		push(xs);
		setTimeout(X,0);
	};
	X();
})();
