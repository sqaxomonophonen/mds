/*
allpass-filtered feedback; a reverb component
Ported directly from the Freeverb VST code by "Jezar at Dreampoint".
See also: https://ccrma.stanford.edu/~jos/pasp/Freeverb.html
*/
((size,feedback)=>{
	let cursor = 0;
	let buffer = new Float32Array(size);
	return (A) => {
		let i,input,bufout;
		let n = A.length;;
		for (i=0; i<n; i++) {
			input = A[i];
			bufout = buffer[cursor];
			A[i] = bufout - input;
			buffer[cursor] = input + (bufout*feedback);
			if (++cursor >= size) cursor = 0;
		}
	};
})
