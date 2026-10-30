// Greek polis style: variant 0 = colonnade temple, variant 1 = semicircular assembly theatre.
import { buildGreekTemple } from './styles-greek-temple.js';
import { buildGreekTheatre } from './styles-greek-theatre.js';
export function buildGreek(opts = {}) {
  return ((opts.variant | 0) % 2 ? buildGreekTheatre : buildGreekTemple)(opts);
}
export { buildGreekTemple, buildGreekTheatre };
