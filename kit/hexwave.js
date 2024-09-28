/*
stolen/ported from stb_hexwave.h (https://github.com/nothings/stb/blob/master/stb_hexwave.h)

export is a function that takes (width,oversample), corresponding to
hexwave_init() in stb_hexwave.h. this returns an object "o" with two "methods":
 o.c(reflect_flag, peak_time, half_height, zero_wait)  corresponds to: hexwave_change()
 o.g(xs,dt)                                            corresponds to: hexwave_generate_samples()
hexwave defaults to a sawtooth wave
*/

((_=>{
	// TODO cache/memoize on (width,oversample)? NOTE the only optimization
	// I'm hoping to achieve here is memory locality for the blep/blamp
	// tables across multiple hexwave instances (stb_hexwave.h also uses
	// shared tables)

	// width should be less than 64
	return ((width,oversample) => {
		let halfwidth = (width/2)|0,
		half = halfwidth*oversample,
		blep_buffer_size = width*(oversample+1),
		n = 2*half+1,
		step = new Float32Array(n),
		ramp = new Float32Array(n),
		blep_buffer = new Float32Array(blep_buffer_size),
		blamp_buffer = new Float32Array(blep_buffer_size),
		i,j,
		tmp0,tmp1,tmp2,
		a0=0,a1=0
		;

		// compute BLEP and BLAMP by integerating windowed sinc
		for (i=0;i<n;i++) {
			for (j=0;j<16;j++) {
				tmp0/*sinc_t*/ = @DEF(PI) * (i-half) / oversample;
				tmp1/*sinc*/ = (i==half) ? 1 : Math.sin(tmp0/*sinc_t*/) / tmp0/*sinc_t*/;
				tmp0/*wt*/ = 2*@DEF(PI) * i / (n-1);
				tmp2/*window*/ = (0.355768 - 0.487396*Math.cos(tmp0) + 0.144232*Math.cos(2*tmp0) - 0.012604*Math.cos(3*tmp0)); // Nuttall
				a0 += (tmp2/*window*/ * tmp1/*sinc*/)/16;
				a1 += a0/16;
			}
			step[i] = a0;
			ramp[i] = a1;
		}

		// renormalize
		for (i=0;i<n;i++) {
			step[i] *= (1 / step[n-1]); // step needs to reach to 1.0
			ramp[i] *= (halfwidth / ramp[n-1]); // ramp needs to become a slope of 1.0 after oversampling
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

		let time=0,
		prev_dt,
		temp_output = new Float32Array(2*width),
		buffer = new Float32Array(2*width),
		add_oversampled_bleplike = (output, offset, time_since_transition, scale, data) => {
			let i,
			slot = Math.min((time_since_transition * oversample)|0, oversample-1), // clamp in case the floats overshoot
			d1o = slot*width,
			d2o = (slot+1)*width,
			lerpweight = time_since_transition * oversample - slot
			;
			for (i=0; i < width; i++) {
				output[offset+i] += scale * (data[d1o+i] + (data[d2o+i]-data[d1o+i])*lerpweight);
			}
		},
		blamp = (output, offset, time_since_transition, scale) => add_oversampled_bleplike(output, offset, time_since_transition, scale, blamp_buffer),
		blep = (output, offset, time_since_transition, scale) => add_oversampled_bleplike(output, offset, time_since_transition, scale, blep_buffer),
		vert, // {t:time, v:value, s:slope},
		pending,
		current = [1,0,0,0], // default: sawtooth
		clamp01 = (x) => x>1?1:x<0?0:x,
		generate_linesegs = (dt)=>{
			let [reflect_flag, peak_time, half_height, zero_wait] = current,
			zwh = zero_wait/2,
			j
			;

			vert = [
				{t:0,v:0}, // [0]
				{t:zwh,v:0}, // [1]
				{t:peak_time/2 + zwh*(1-peak_time), v:1}, // [2]
				{t:0.5, v:half_height}, // [3]
				{}, {}, {}, {}, // [4:7]
				{t:1,v:0}, // [8]
			];

			for(j=4;j<8;j++) {
				vert[j].t = reflect_flag ? 1 - vert[7-j].t  : 0.5 + vert[j-4].t;
				vert[j].v = reflect_flag ?   - vert[7-j].v  :     - vert[j-4].v;
			}

			for (j=0; j<8; j++) {
				if (vert[j+1].t <= vert[j].t + (dt/256)) {
					// if change takes place over less than a fraction of a sample treat as discontinuity
					//
					// otherwise the slope computation can blow up to arbitrarily large and we
					// try to generate a huge BLAMP and the result is wrong.
					//
					// why does this happen if the math is right? i believe if done perfectly,
					// the two BLAMPs on either side of the slope would cancel out, but our
					// BLAMPs have only limited sub-sample precision and limited integration
					// accuracy. or maybe it's just the math blowing up w/ floating point precision
					// limits as we try to make x * (1/x) cancel out
					//
					// min_len (dt/256) verified artifact-free even near nyquist with only oversample=4
					vert[j+1].t = vert[j].t;
				}
			}

			if (vert[8].t != 1) {
				// if the above fixup moved the endpoint away from 1.0, move it back,
				// along with any other vertices that got moved to the same time
				for (j=5; j<9; j++) {
					if (vert[j].t == vert[8].t) {
						vert[j].t = 1;
					}
				}
			}

			// compute the exact slopes from the final fixed-up positions
			for (j=0; j<8; j++) {
				if (vert[j+1].t == vert[j].t) {
					vert[j].s = 0;
				} else {
					vert[j].s = (vert[j+1].v - vert[j].v) / (vert[j+1].t - vert[j].t);
				}
			}

			// wraparound at end
			vert[8].t = 1;
			vert[8].v = vert[0].v;
			vert[8].s = vert[0].s;
		}
		;

		return {

			c: (reflect_flag, peak_time, half_height, zero_wait) => {
				pending = [reflect_flag, clamp01(peak_time), half_height, clamp01(zero_wait)];
			},

			g: (A,dt) => {
				let i,j,
				num_samples = A.length,
				recip_dt = dt?1/dt:0,
				pass,
				i1,out,
				stop
				;

				generate_linesegs(dt);

				A.fill(0);

				if (dt != prev_dt) {
					for (j=1;j<6;j++) {
						if (time < vert[j].t) break;
					}
					if (vert[j].s != 0) blamp(A, 0, 0, (dt - prev_dt)*vert[j].s);
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

					if (pass == 0) {
						if (num_samples < width) continue;
						// run as far as we can without
						// overwriting the end of the user's
						// buffer
						out = A;
						i1 = num_samples - width;
					} else {
						// generate the rest into a temp buffer
						out = temp_output;
						i1 = (num_samples >= width) ? width : num_samples;
					}

					// determine current segment
					for (j=0; j < 8; j++) {
						if (time < vert[j+1].t) break;
					}

					i = 0;
					stop = 0;
					for (;;) {
						while (time < vert[j+1].t) {
							if (i == i1) {
								stop = 1;
								break;
							}
							out[i+halfwidth] += vert[j].v + vert[j].s*(time - vert[j].t);
							time += dt;
							i++;
						}
						if (stop) break;
						// transition from lineseg starting at j to lineseg starting at j+1
						if (vert[j].t == vert[j+1].t) {
							blep(out, i, recip_dt*(time-vert[j+1].t), (vert[j+1].v - vert[j].v));
						}
						blamp(out, i, recip_dt*(time-vert[j+1].t), dt*(vert[j+1].s - vert[j].s));
						j++;

						if (j == 8) {
							// change to different waveform if there's a change pending
							j = 0;
							time -= 1; // time was >= 1 if j==8
							if (pending) {
								//let prev_s0 = vert[j].s;
								//let prev_v0 = vert[j]>v;
								current = pending;
								generate_linesegs(dt);
								pending=0; // type abuse! but shorter than `undefined`
								/*
								// the following never occurs with this oscillator, but it makes
								// the code work in more general cases
								if (vert[j].v != prev_v0) {
									blep(out, i, recip_dt*time, (vert[j].v - prev_v0));
								}
								if (vert[j].s != prev_s0) {
									blamp(out, i, recip_dt*time, dt*(vert[j].s - prev_s0));
								}
								*/
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
						A[num_samples - width + i] += temp_output[i];
					}
					buffer.set(temp_output.slice(width, width*2));
				} else {
					A.set(temp_output.slice(0,num_samples));
					buffer.set(temp_output.slice(num_samples, num_samples + width));
				}
			},
		};
	})
})())
