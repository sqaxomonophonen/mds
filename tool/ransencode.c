// cc -O2 -Wall ransencode.c -o ransencode

#include <stdio.h>
#include <stdlib.h>
#include <assert.h>
#include <unistd.h>
#include "rans_byte.h"

struct pair { int start,freq; };

int main(int argc, char** argv)
{
	if (argc != 2) {
		fprintf(stderr, "Usage: %s <scale bits>\n\n", argv[0]);
		fprintf(stderr, "Symbol list is read from stdin and must contain \"<start> <freq>\\n\" pairs.\n");
		fprintf(stderr, "Symbol list must be in *forward* order (it is encoded in reverse\n");
		fprintf(stderr, "order per rANS specs, but that is handled by this program).\n");
		fprintf(stderr, "Binary rANS stream is written to stdout\n");
		exit(EXIT_FAILURE);
	}
	const int scale_bits = atoi(argv[1]);
	assert(1 <= scale_bits && scale_bits <= 16);

	struct pair* pairs = calloc(1<<20, sizeof *pairs);

	int start,freq;
	struct pair* pp = pairs;
	int n_symbols = 0;
	while (fscanf(stdin, "%d %d\n", &start, &freq) == 2) {
		pp->start = start;
		pp->freq = freq;
		pp++;
		n_symbols++;
	}

	const size_t buffer_size = 1<<20;
	uint8_t* buffer = malloc(buffer_size);
	uint8_t* buffer_end = buffer+buffer_size;
	uint8_t* ptr = buffer_end;

	RansState rans;
	RansEncInit(&rans);
	for (int i = 0; i < n_symbols; i++) {
		RansEncSymbol esym = {0};
		pp--;
		RansEncSymbolInit(&esym, pp->start, pp->freq, scale_bits);
		RansEncPutSymbol(&rans, &ptr, &esym);
	}
	assert(pp == pairs);
	RansEncFlush(&rans, &ptr);
	const size_t encsize = buffer_end - ptr;
	fprintf(stderr, "%d symbols, %zd bytes\n", n_symbols, encsize);

	if (isatty(fileno(stdout))) {
		fprintf(stderr, "stdout is a tty: don't want to write!\n");
		exit(EXIT_FAILURE);
	}
	assert(fwrite(ptr, encsize, 1, stdout) == 1);

	return EXIT_SUCCESS;
}
