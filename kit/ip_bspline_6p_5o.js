// interpolator: 6-point, 5th-order B-spline (x-form) (source: deip.pdf by Niemitalo)
((A,x) => {
	const i = Math.floor(x);
	x -= i;

	const ym2py2 = A[i-2]+A[i+2], ym1py1 = A[i-1]+A[i+1];
	const y2mym2 = A[i+2]-A[i-2], y1mym1 = A[i+1]-A[i-1];
	const sixthym1py1 = (1/6)*ym1py1;
	const c0 = (1/120) * ym2py2 + (13/60)*ym1py1 + (11/20)*A[i];
	const c1 = (1/24)  * y2mym2 + (5/12)*y1mym1;
	const c2 = (1/12)  * ym2py2 + sixthym1py1 - (1/2)*A[i];
	const c3 = (1/12)  * y2mym2 - (1/6)*y1mym1;
	const c4 = (1/24)  * ym2py2 - sixthym1py1 + (1/4)*A[i];
	const c5 = (1/120) * (A[i+3]-A[i-2]) + (1/24)*(A[i-1]-A[i+2]) + (1/12)*(A[i+1]-A[i]);

	return ((((c5*x+c4)*x+c3)*x+c2)*x+c1)*x+c0;
})
