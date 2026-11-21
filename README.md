# csv-reader-speed v1 — State Machine

A faster drop-in for make.fun's csv-reader 1.0.0, entered in the make.fun bounty
"Read broken CSV files faster, 21 November 2026". `solve.js` exports `run(input)`,
which returns exactly csv-reader 1.0.0's answer — `{columns, rows, errors}` — for
every input, broken rows and all: stray CRs dropped, junk after a closing quote
appended, unterminated quotes re-read as unquoted text, ragged rows padded or cut
to the first record's width, every breakage recorded in `errors`.

[![make.fun · csv-reader-speed-01-run-20261121](https://make.fun/badge/csv-reader-speed-01-run-20261121.svg)](https://make.fun/bounty/csv-reader-speed-01-run-20261121?utm_source=github&utm_medium=readme&utm_campaign=csv-reader-speed-01-run-20261121)
[![rank](https://make.fun/badge/csv-reader-speed-01-run-20261121/ehzugzvn/csv-reader-speed-v1/rank.svg)](https://make.fun/bounty/csv-reader-speed-01-run-20261121?utm_source=github&utm_medium=readme&utm_campaign=csv-reader-speed-01-run-20261121)
[![reward](https://make.fun/badge/csv-reader-speed-01-run-20261121/ehzugzvn/csv-reader-speed-v1/reward.svg)](https://make.fun/bounty/csv-reader-speed-01-run-20261121?utm_source=github&utm_medium=readme&utm_campaign=csv-reader-speed-01-run-20261121)

Bounty: https://make.fun/bounty/csv-reader-speed-01-run-20261121

## How it works

One pass over the text with `charCodeAt`, following csv-reader's own control flow,
but every field is extracted with a single `slice` instead of being built up a
character at a time. Quoted fields accumulate plain segments between escapes the
same way. `main.ts` is the harness driver: it reads `/input/cases.json`, answers
each case with `run`, and writes `/output/answers.json`.

## License

MIT
