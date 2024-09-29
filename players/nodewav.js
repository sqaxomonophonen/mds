fs=require('fs');
P=(sample_rate, n_channels, n_frames, song_text, main_color)=>{
	const data_length = n_frames * n_channels * 2;
	const wave_length = 44+data_length;

	const clampmm = (x,min,max)=>Math.min(max,Math.max(min,x));
	let remaining = n_frames;

	let cursor = 0;
	let WAVE = new Uint8Array(wave_length),
	wu16 = value => { WAVE[cursor++]=value; WAVE[cursor++]=value>>8; },
	wu32 = value => { wu16(value); wu16(value>>16); },
	wstr = s => { for (s of s) WAVE[cursor++]=s.charCodeAt(0); }

	wstr("RIFF");
	wu32(data_length+36);
	wstr("WAVEfmt ");
	wu32(16);
	wu16(1);
	wu16(n_channels);
	wu32(sample_rate);
	wu32(sample_rate * n_channels * 2);
	wu16(n_channels * 2);
	wu16(16);
	wstr("data");
	wu32(data_length);

	let last_meter;
	return (chunk) => {
		let meter = "[";
		const W=76;
		for (let i = 0; i < W; i++) {
			meter += i/W < (n_frames-remaining)/n_frames ? "#" : ".";
		}
		meter += "]";
		if (meter !== last_meter) {
			process.stdout.write( meter + "\r");
			last_meter = meter;
		}
		for (let i = 0; i < chunk.length; i++) {
			wu16(clampmm(chunk[i],-1,1)*32767 + Math.random()*0.5);
		}
		remaining -= (chunk.length / n_channels);
		if (remaining <= 0) {
			const filename = "__render."+song_text.replaceAll(" ","_")+".wav";
			fs.writeFileSync(filename, WAVE, "binary");
			console.log("\nWrote:", filename, WAVE.length, "bytes");
			process.exit(0);
		}
	};
}
