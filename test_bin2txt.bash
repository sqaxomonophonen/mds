#!/usr/bin/env bash
set -e
cd $(dirname $0)

./build.bash

dd if=/dev/urandom of=__NOISE bs=1024 count=31 status=none

bytsum=$(python -c 'print(sum([x for x in open("__NOISE","rb").read()]))')
chksum=$(python -c 'import functools;print(functools.reduce(lambda x,y:x^y, [x for x in open("__NOISE","rb").read()]))')

./tool_bin2txt.js b252d44n351 __NOISE __NOISE.252
./tool_bin2txt.js b93d13n85   __NOISE __NOISE.93

make_test() {
	BASE=$1 ; shift
	DECODER=$1 ; shift
	HEAD=$1 ; shift

	if [ -z "$HEAD" ] ; then
		echo "bad make_test() call"
		exit 1
	fi

	O=__VERIFY.$BASE.html
	echo -n $HEAD > $O
	echo -n 'console.log("OK0");' >> $O
	cat $DECODER >> $O
	echo -n 'console.log("OK1");' >> $O
	echo -n 'Y=Y("' >> $O
	cat __NOISE.$BASE >> $O
	echo -n '");' >> $O
	echo -n 'console.log("OK2");' >> $O
	echo -n 'let bytsum=0,chksum=0;' >> $O
	echo -n 'let t0 = Date.now();' >> $O
	echo -n 'for(let i=0;i<(31*1024);i++){' >> $O
	echo -n 'let b=Y(); bytsum += b; chksum ^= b;' >> $O
	echo -n '};' >> $O;
	echo -n 'let dt = Date.now()-t0;' >> $O
	echo -n 'window.onload=_=>{document.body.innerHTML = `' >> $O
	echo -n 'bytesum=${bytsum} (${bytsum==='$bytsum'?"OK":"FAIL"}) / ' >> $O
	echo -n 'chksum=${chksum} (${chksum==='$chksum'?"OK":"FAIL"}) ' >> $O
	echo -n '<span style="color:#aaa">(took ${dt}ms)</span>`;}' >> $O
	echo -n '</script>' >> $O
	ls -l $O
}

make_test 252 b252n351decoder.min.js   '<meta charset="ISO-8859-1"><script>'
make_test 93  b93n85decoder.min.js     '<!DOCTYPE html><title>compliance!</title><script>' 

echo "NOTE: to complete the end-to-end test, open the above HTML files in various browsers."
echo "They should display: bytesum=$bytsum (OK) / chksum=$chksum (OK)"
