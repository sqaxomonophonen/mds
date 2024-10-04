// interpolator: linear
((A,x) => {
	const i = Math.floor(x);
	x -= i;
	return A[i] + x*(A[i+1]-A[i]);
})
