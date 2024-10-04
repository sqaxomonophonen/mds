// source: https://github.com/magnusjonsson/microtracker
// Good/simple tanh(x) approximation. It doesn't exactly stay confined to
// [-1;1], but you need pretty large input values to notice it.
// (fasttanh(±16.6)~=±2)
(x => x*(27+x*x)/(27+9*x*x))
