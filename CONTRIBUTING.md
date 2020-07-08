# Contributing to the Optimizely  JavaScript SDK

We welcome contributions and feedback! All contributors must sign our [Contributor License Agreement (CLA)](https://docs.google.com/a/optimizely.com/forms/d/e/1FAIpQLSf9cbouWptIpMgukAKZZOIAhafvjFCV8hS00XJLWQnWDFtwtA/viewform) to be eligible to contribute. Please read the [README](README.md) to set up your development environment, then read the guidelines below for information on submitting your code.

## Development process

1. Fork the repository and create your branch from master.
2. Please follow the [commit message guidelines](https://github.com/angular/angular/blob/master/CONTRIBUTING.md#-commit-message-guidelines) for each commit message.
3. Make sure to add tests!
4. Update relevant `CHANGELOG.md` if users should know about this change.
5. Run `npm run lint` to ensure there are no lint errors.
6. `git push` your changes to GitHub.
7. Open a PR from your fork into the master branch of the original repo
8. Make sure that all unit tests are passing and that there are no merge conflicts between your branch and `master`.
9. Open a pull request from `YOUR_NAME/branch_name` to `master`.
10. A repository maintainer will review your pull request and, if all goes well, squash and merge it!

## Pull request acceptance criteria

- **All code must have test coverage.** We use Mocha's chai assertion library and Sinon. Changes in functionality should have accompanying unit tests. Bug fixes should have accompanying regression tests.
  - Tests are located in the `tests.js` file.
- Please don't change the `package.json` or `VERSION`. We'll take care of bumping the version when we next release.
- Lint your code with our `npm run lint` before submitting.

## Style

To enforce style rules, we use ESLint. See our [.eslintrc.js](.eslintrc.js) for more information on our specific style rules.

## License

All contributions are under the CLA mentioned above. For this project, Optimizely uses the Apache 2.0 license, and so asks that by contributing your code, you agree to license your contribution under the terms of the [Apache License v2.0](http://www.apache.org/licenses/LICENSE-2.0). Your contributions should also include the following header:

```
/****************************************************************************
 * Copyright YEAR, Optimizely, Inc. and contributors                        *
 *                                                                          *
 * Licensed under the Apache License, Version 2.0 (the "License");          *
 * you may not use this file except in compliance with the License.         *
 * You may obtain a copy of the License at                                  *
 *                                                                          *
 *    http://www.apache.org/licenses/LICENSE-2.0                            *
 *                                                                          *
 * Unless required by applicable law or agreed to in writing, software      *
 * distributed under the License is distributed on an "AS IS" BASIS,        *
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. *
 * See the License for the specific language governing permissions and      *
 * limitations under the License.                                           *
 ***************************************************************************/
```

The YEAR above should be the year of the contribution. If work on the file has been done over multiple years, list each year in the section above. Example: Optimizely writes the file and releases it in 2014. No changes are made in 2015. Change made in 2016. YEAR should be “2014, 2016”.

## Contact

If you have questions, please contact developers@optimizely.com.
