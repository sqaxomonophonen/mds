((a,A)=>{
	let inc=1,idx=0;
	if (A.length==1) inc=0;
	for (let i = 0; i < a.length; i++) {a[i]*=A[idx];idx+=inc;}
})
