// scales input by a constant scalar
(A,scalar)=>{
	let i,n;
	n=A.length;
	for (i=0;i<n;i++) A[i] *= scalar;
}
