// source: https://github.com/magnusjonsson/microtracker
(_=>{
	let tanh = @KIT(fasttanh);
	//let tanh = Math.tanh;
	let ii=0,y0=0,y1=0,y2=0,y3=0;
	return (A, omega, resonance) => {
		let ib = 1-2*omega;
		let k = 4*resonance;
		let zperx = -k*omega*omega*omega*omega;
		let zperx1i = 1/(1-zperx);
		let zconst,x,i,j,ny0,ny1,ny2,ny3;
		for (i = 0; i < A.length; i++) {
			zconst = 0.5*(ii + A[i] - k*(y3+(omega*(omega*(omega*ib*y0 + ib*y1) + ib*y2) + ib*y3)));
			x = zconst*zperx1i;
			for (j=0;j<8;j++) x = tanh(zconst + zperx*x);
			ny0 = omega*x        + ib*y0;
			ny1 = omega*(y0+ny0) + ib*y1;
			ny2 = omega*(y1+ny1) + ib*y2;
			ny3 = omega*(y2+ny2) + ib*y3;
			y0 = ny0;
			y1 = ny1;
			y2 = ny2;
			y3 = ny3;
			ii = A[i];
			A[i] = y3;
		}
	};
})
