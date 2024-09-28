registerProcessor("a", class extends AudioWorkletProcessor {
	constructor() {
		super();
		this.c = []; // chunks
		this.p = 0; // position
		this.port.onmessage = ev => {
			this.c = this.c.concat(ev.data.c);
		};
	}

	process(inputs, outputs, parameters) {
		outputs = outputs[0];
		let n_frames = outputs[0].length,
		n_channels = outputs.length,
		position = this.p,
		chunks = this.c,
		n_chunks = chunks.length,
		chunk_size = chunks[0] && chunks[0].length,
		chunk_frames = (chunk_size/n_channels)|0,
		i0,i1
		;
		for (i0 = 0; i0 < n_frames; i0++) {
			if (position >= n_chunks*chunk_frames) break;
			for (i1 = 0; i1 < n_channels; i1++) {
				outputs[i1][i0] = chunks[(position / chunk_frames)|0][(position % chunk_frames)*n_channels+i1];
			}
			position++;
		}
		this.p = position;
		return true;
	}
});
