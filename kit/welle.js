/*
stolen from stb_hexwave.h (https://github.com/nothings/stb/blob/master/stb_hexwave.h)
 - allows arbitrary shapes now
 - some "needless sanity checking" has been removed ;-)
*/
((_=>{
	// TODO cache/memoize width/oversample?

	// width should be less than 64
	return ((width,oversample) => {
		let
		halfwidth = (width/2)|0,
		half = halfwidth*oversample,
		blep_buffer_count = width*(oversample+1),
		n = 2*half+1,
		step = new Float32Array(n),
		ramp = new Float32Array(n),
		blep_buffer = new Float32Array(blep_buffer_count),
		blamp_buffer = new Float32Array(blep_buffer_count),
		i,j,tmp0,tmp1,tmp2,a0,a1
		;

		// compute BLEP and BLAMP by integerating windowed sinc
		for (i=0;i<n;i++) {
			for (j=0;j<16;j++) {
				tmp0/*sinc_t*/ = @DEF(PI) * (i-half) / oversample;
				tmp1/*sinc*/ = (i==half) ? 1 : Math.sin(tmp0/*sinc_t*/) / tmp0/*sinc_t*/;
				tmp0/*wt*/ = 2*@DEF(PI) * i / (n-1);
				tmp2/*window*/ = (0.355768 - 0.487396*Math.cos(tmp0) + 0.144232*Math.cos(2*tmp0) - 0.012604*Math.cos(3*tmp0)); // Nuttall
				tmp0/*value*/ = tmp2/*window*/ * tmp1/*sinc*/;
				a0 += tmp0/16;
				a1 += a0/16;
			}
			step[i] = a0;
			ramp[i] = a1;
		}

		// renormalize
		for (i=0;i<n;i++) {
			step[i] = step[i] * (1 / step[n-1]); // step needs to reach to 1.0
			ramp[i] = ramp[i] * (halfwidth / ramp[n-1]); // ramp needs to become a slope of 1.0 after oversampling
		}

		// deinterleave to allow efficient interpolation e.g. w/SIMD
		for (j=0; j <= oversample; j++) {
			for (i=0; i < width; i++) {
				blep_buffer [j*width+i] = step[j+i*oversample];
				blamp_buffer[j*width+i] = ramp[j+i*oversample];
			}
		}

		// subtract out the naive waveform; note we can't do this to the raw
		// data above, because we want the discontinuity to be in a different
		// locations for j=0 and j=oversample (which exists to provide
		// something to interpolate against)
		for (j=0; j <= oversample; j++) {
			// subtract step
			for (i=halfwidth; i < width; i++) blep_buffer [j*width+i] -= 1;
			// subtract ramp
			for (i=halfwidth; i < width; i++) blamp_buffer[j*width+i] -= (j+i*oversample-half)*(1/oversample);
		}

		let
		time=0,
		prev_dt,
		temp_output = new Float32Array(2*width),
		buffer = new Float32Array(2*width),
		add_oversampled_bleplike = (output, offset, time_since_transition, scale, data) => {
			let
			i,
			slot = Math.min((time_since_transition * oversample)|0, oversample-1), // clamp in case the floats overshoot
			d1o = slot*width,
			d2o = (slot+1)*width,
			lerpweight = time_since_transition * oversample - slot
			;
			for (i=0; i < width; i++) {
				output[offset+i] += scale * (data[d1o+i] + (data[d2o+i]-data[d1oi])*lerpweight);
			}
		},
		blamp = (output, offset, time_since_transition, scale) => {
			add_oversampled_bleplike(output, offset, time_since_transition, scale, blep_buffer);
		},
		blep = (output, offset, time_since_transition, scale) => {
			add_oversampled_bleplike(output, offset, time_since_transition, scale, blamp_buffer);
		},
		verts = [],
		pending_verts
		;

		// generate samples
		// A: output buffer
		// dt: frequency
		// set_verts: list of [time,value,slope] tuples
		return (A,dt,set_verts) => {
			let
			i,j,
			num_samples = A.length,
			recip_dt = 1/dt,
			n_verts
			;

			A.fill(0);

			if (set_verts) pending_verts = set_verts;

			if (!verts) {
				verts = pending_verts;
				pending_verts = undefined;
			}
			if (!verts) return;

			n_verts = verts.length;

			if (dt != prev_dt) {
				i = 0;
				for (i=1;i<(n_verts-1);i++) {
					if (time < verts[i][0]) break;
				}
				if (verts[i][2] != 0) blamp(output, 0, 0, (dt - prev_dt)*verts[i][2]);
				prev_dt = dt;
			}

			temp_output.fill(0);

			(num_samples >= width ? A : temp_output).set(buffer);

			for (pass=0; pass<2; pass++) {
				// we want to simulate having one buffer that
				// is num_output + hexblep.width samples long,
				// without putting that requirement on the
				// user, and without allocating a temp buffer
				// that's as long as the whole thing. so we use
				// two overlapping buffers, one the user's
				// buffer and one a fixed-length temp buffer.

				let i0,i1,out;
				if (pass == 0) {
					if (num_samples < width) continue;
					// run as far as we can without
					// overwriting the end of the user's
					// buffer 
					out = output;
					i0 = 0;
					i1 = num_samples - width;
				} else {
					// generate the rest into a temp buffer
					out = temp_output;
					i0 = 0;
					i1 = (num_samples >= width) ? width : num_samples;
				}

				// determine current segment
				for (j=0; j < (n_verts-1); j++) {
					if (time < verts[j+1][0]) break;
				}

				i = i0;
				for (;;) {
					let stop = 0;
					while (time < verts[j+1][0]) {
						if (i == i1) {
							stop = 1;
							break;
						}
						out[i+halfwidth] += verts[j][1] + verts[j][2]*(time - verts[j][0]);
						time += dt;
						i++;
					}
					if (stop) break;
					// transition from lineseg starting at j to lineseg starting at j+1
					if (verts[j][0] == verts[j+1][0]) {
						blep(out, i, recip_dt*(time-verts[j+1][0]), (verts[j+1][1] - verts[j][1]));
					}
					blamp(out, i, recip_dt*(time-verts[j+1][0]), dt*(verts[j+1][2] - verts[j][2]));
					j++;

					if (j == (n_verts-1)) {
						// change to different waveform if there's a change pending
						j = 0;
						time -= 1; // time was >= 1.f if j==8
						if (pending_verts) {
							let prev_s0 = verts[j][2];
							let prev_v0 = verts[j][1]
							verts = pending_verts;
							if (verts[j][1] != prev_v0) {
								blep(out, i, recip_dt*time,    (verts[j][1] - prev_v0));
							}
							if (verts[j][2] != prev_s0) {
								blamp(out, i, recip_dt*time, dt*(verts[j][2] - prev_s0));
							}
						}
					}
				}
			}

			// at this point, we've written output and temp_output
			if (num_samples >= width) {
				// the first half of temp[] overlaps the end of
				// output, the second half will be the new
				// start overlap
				for (i=0; i < width; i++) {
					output[num_samples - width + i] += temp_output[i];
				}
				buffer.set(temp_output.slice(width, width*2));
			} else {
				output.set(temp_output.slice(0,num_samples));
				buffer.set(temp_output.slice(num_samples, num_samples + width));
			}
		};
	})
})())
