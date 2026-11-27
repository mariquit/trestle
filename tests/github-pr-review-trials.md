# OpenCode trial for github-pr-review

OpenCode v2.2.5 with `opencode/big-pickle` loaded a checkout-installed copy of the skill in a temporary Git repository. A smoke prompt returned `OK`.

The synthetic branch changed `hasItems` from `items.length > 0` to `items.length >= 0`. The review request specified `main` as the base, required `false` for an empty array, and prohibited edits, tests, and GitHub access. The first attempt inspected the diff but timed out before returning a verdict. A fresh run returned **Request Changes**, cited `items.mjs:2`, explained the empty-array regression, recommended restoring the strict comparison, and identified the result as inspection-only. The checkout remained clean. Live GitHub reads and review publishing were not tested.
