P=(sample_rate, n_channels, n_frames, song_text, main_color)=>{
	let prebuf=[],
	clampmm = (x,min,max)=>Math.min(max,Math.max(min,x)),
	data_length = n_frames * n_channels * 2,
	wave_length = 44+data_length,
	WAVE = new Uint8Array(wave_length),
	cursor = 0,
	wu16 = value => { WAVE[cursor++]=value; WAVE[cursor++]=value>>8; },
	wu32 = value => { wu16(value); wu16(value>>16); },
	wstr = s => { for (s of s) WAVE[cursor++]=s.charCodeAt(0); },
	playing=0, audio_ctx, worklet_node ,
	post_worklet_message = message => worklet_node.port.postMessage(message)
	;

	window.onload=_=>{
		document.body.innerHTML = '<button id="a">PLAY</button><a href="#" style="visibility:hidden;" id="b">-</a>';
		a.onclick = () => {
			if (playing) return;
			playing=1;
			audio_ctx = new AudioContext({sampleRate:sample_rate});
			audio_ctx.audioWorklet.addModule("data:text/javascript;base64,"+btoa(A0)).then(_=>{
				worklet_node = new AudioWorkletNode(audio_ctx, "a",{numberOfInputs:0,outputChannelCount:[n_channels]});
				worklet_node.connect(audio_ctx.destination);
				worklet_node.port.start();
				audio_ctx.resume();
				post_worklet_message({c:prebuf});
			});
		};
	}

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
		if (prebuf) {
			prebuf.push(chunk);
		} else {
			// XXX saving a few chars here thanks to the duality of
			// .concat(). e.g. if xs=[1,2], then xs.concat(3) and
			// xs.concat([3]) gives the same result
			post_worklet_message({c:chunk});
		}
		for (let i = 0; i < chunk.length; i++) {
			wu16(clampmm(chunk[i],-1,1)*32767 + Math.random()*0.5);
		}
		if ((cursor-wave_length) === 0) {
			let filename = song_text.replaceAll(' ','_')+'.wav';
			b.href = URL.createObjectURL(new File([WAVE],filename,{'type':'audio/wav'}));
			b.innerHTML = filename;
			b.download = filename;
			b.style.visibility = '';
		}
	};
}
