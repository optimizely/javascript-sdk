#Contributing to the Optimizely JavaScript SDK

We welcome contributions and feedback! Please read the [README](README.md) to set up your development environment, then read the guidelines below for information on submitting your code.

## Development process

1. Create a branch off of `master`: `git checkout -b YOUR_NAME/branch_name`.
2. Commit your changes. Make sure to add tests!
3. Run `npm run lint` to ensure there are no lint errors.
4. Run `webpack` to generate the built and minified file for those not installing via `npm`
5. `git push` your changes to GitHub.
6. Make sure that all unit tests are passing and that there are no merge conflicts between your branch and `master`.
7. Open a pull request from `YOUR_NAME/branch_name` to `master`.
8. A repository maintainer will review your pull request and, if all goes well, merge it!

##Pull request acceptance criteria

* **All code must have test coverage.** We use Mocha's chai assertion library and Sinon. Changes in functionality should have accompanying unit tests. Bug fixes should have accompanying regression tests.
  * Tests are located in the `tests.js` file.
* Please don't change the `package.json` or `VERSION`. We'll take care of bumping the version when we next release.
* Lint your code with our `npm run lint` before submitting.

##Style
To enforce style rules, we use ESLint. See our [.eslintrc.js](.eslintrc.js) for more information on our specific style rules.

##License

By contributing your code, you agree to license your contribution under the terms of the [Apache License v2.0](http://www.apache.org/licenses/LICENSE-2.0). Your contributions should also include the following header:

```
/**
 * Copyright 2016, Optimizely
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
 ```

##Contact
If you have questions, please contact developers@optimizely.com.
