// interpolator: 4-point, 3rd-order B-spline (x-form) (source: deip.pdf by Niemitalo)
((A,x) => {
	const i = Math.floor(x);
	x -= i;

	const ym1py1 = A[i-1]+A[i+1];
	const c0 = (1/6)*ym1py1 + (2/3)*A[i];
	const c1 = (1/2)*(A[i+1]-A[i-1]);
	const c2 = (1/2)*ym1py1 - A[i];
	const c3 = (1/2)*(A[i]-A[i+1]) + (1/6)*(A[i+2]-A[i-1]);

	return ((c3*x+c2)*x+c1)*x+c0;
})
