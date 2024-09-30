/*
comb-filtered feedback; a reverb component
Ported directly from the Freeverb VST code by "Jezar at Dreampoint".
See also: https://ccrma.stanford.edu/~jos/pasp/Freeverb.html
*/
((size,feedback,damp)=>{
	let cursor = 0;
	let store = 0;
	let buffer = new Float32Array(size);
	let idamp = 1-damp;
	return (A) => {
		let i,input,output;
		let n = A.length;
		for (i=0; i<n; i++) {
			input = A[i];
			output = buffer[cursor];
			store = (output*idamp) + (store*damp);
			buffer[cursor] = input + (store*feedback);
			if (++cursor >= size) cursor = 0;
			A[i] = output;
		}
	};
})
