const skip = "\x00\n\r\"\\";

let b123map = [];
for (let i = 0; i < 128; i++) {
	if (skip.indexOf(String.fromCharCode(i)) >= 0) continue;
	b123map.push(i);
}
if (b123map.length !== 123) throw new Error("XXX");

module.exports = {
	b123map: b123map,
};
