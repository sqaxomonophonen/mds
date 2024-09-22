#!/usr/bin/env bash
set -e

cd $(dirname $0)

jsc() {
	if [ "$DEBUG" = "1" ] ; then
		cat $1
	else
		uglifyjs $1 --compress --rename --mangle
	fi
}

should_rebuild() {
	artifact=$1 ; shift
	while true ; do
		src=$1 ; shift
		if [ -z "$src" ] ; then
			break
		fi
		if [ ! -e $artifact -o $src -nt $artifact ] ; then
			true ; return
		fi
	done
	false
}

condjsc() {
	src=$1.js
	min=$1.min.js
	if should_rebuild $min $src ; then
		echo jsc $src ">" $min
		jsc $src > $min
		ls -l $src $min
	fi
}

condjsc dearplayer
condjsc dearplayer_audioworklet

depsbuild="dearplayer_crunchlink.js lib_crunchlink.js"
depsdear="dearplayer.js dearplayer_audioworklet.js dearplayer.html dearplayer.css"
deartifact=dearplayer.build.js

if should_rebuild $deartifact $depsbuild $depsdear ; then
	node dearplayer_crunchlink.js > $deartifact
	ls -l $deartifact
fi

condjsc miniplayer
condjsc miniplayer_audioworklet

#depsmini="miniplayer.js miniplayer_audioworklet.js"
#minifact=miniplayer.build.js

condjsc b93n85decoder
condjsc b252n351decoder
condjsc ransdecoder

if should_rebuild tool_ransencode tool_ransencode.c ; then
	cc -Wall tool_ransencode.c -o tool_ransencode
fi

assemble() {
	METHOD=$1 ; shift
	DECODER=$1 ; shift
	HEAD=$1 ; shift
	PLAYER=$1 ; shift
	SONGCODE=$1 ; shift

	if [ -z "$SONGCODE" ] ; then
		echo "bad assemble() call"
		exit 1
	fi

	jsc $SONGCODE > __song.js

	cat $PLAYER > __build.js
	cat __song.js >> __build.js
	ls -l __build.js

	scale_bits=14

	./tool_text2ransinput.js $scale_bits javascript_symboldefs.json __build.js __js.symtab.json __js.symlist.txt
	./tool_gen_javascript_decoder.js __js.symtab.json __js.prelude.bin __decoder.js
	jsc __decoder.js > __decoder.min.js
	./tool_ransencode $scale_bits __js.symlist.txt __rans
	cat __js.prelude.bin __rans > __bin
	./tool_bin2txt.js $METHOD __bin __bin.$METHOD
	ls -l __js.prelude.bin __decoder.min.js __rans __bin __bin.$METHOD

	O=__build.$METHOD.html

	# html "header"
	echo -n $HEAD > $O
	echo -n '<script>' >> $O

	# setup binary decoder
	cat $DECODER >> $O
	echo -n 'Y=Y("' >> $O
	cat __bin.$METHOD >> $O
	echo -n '");' >> $O

	# rans decoder
	cat ransdecoder.min.js >> $O

	# bootstrap
	cat __decoder.min.js >> $O

	echo -n '</script>' >> $O
	ls -l $O
}

assemble_252() {
	assemble b252d44n351 b252n351decoder.min.js '<meta charset="ISO-8859-1">' $*
}

assemble_93() {
	assemble b93d13n85 b93n85decoder.min.js '<!DOCTYPE html><title>compliance!</title>' $*
}

assemble_252 dearplayer.build.js song33.js
#assemble_93 dearplayer.build.js song33.js
