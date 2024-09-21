P=(sample_rate, n_channels, n_frames, song_text, main_color)=>{
	let
	prebuf=[],
	post_worklet_message,
	n_chunks_generated = 0,
	chunk_frame_length = 0,
	clampmm = (x,min,max)=>Math.min(max,Math.max(min,x)),
	win=window,
	doc=document
	;

	win.onload=_=>{
		doc.body.innerHTML = '<button id="a">PLAY</button><button id="b">.wav</button>';
		//b.disabled = true;
		b.disabled = 1;

		// TODO
	}

	let
	data_length = n_frames * n_channels * 2,
	wave_length = 44+data_length,
	WAVE = new Uint8Array(wave_length),
	cursor = 0,
	wave_url,
	wu16 = value => { WAVE[cursor++]=value; WAVE[cursor++]=value>>8; },
	wu32 = value => { wu16(value); wu16(value>>16); },
	wstr = s => { for (s of s) WAVE[cursor++]=s.charCodeAt(0); }
	;

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

	return (chunk) => {
		chunk_frame_length = chunk.length / n_channels;
		n_chunks_generated++;
		if (prebuf) {
			prebuf.push(chunk);
		} else {
			post_worklet_message({c:chunk});
		}
		for (let i = 0; i < chunk.length; i++) {
			wu16(clampmm(chunk[i],-1,1)*32767 + Math.random()*0.5);
		}
		if ((cursor-wave_length) === 0) {
			let filename = song_text.replaceAll(' ','_')+'.wav';
			dl0.href = URL.createObjectURL(new File([WAVE],filename,{'type':'audio/wav'}));
			dl0.innerHTML = filename;
			dl0.download = filename;
			dl0.style.visibility = '';
		}
	};
}
