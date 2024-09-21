#!/usr/bin/env bash
set -e

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

condjsc b123n118ransdecoder

# TODO
#./text2ransinput.js 14 javascript_symboldefs.json dearplayer.min.js _js.symtab.json _js.symlist.txt
# ./gen_javascript_decoder.js _js.symtab.json
