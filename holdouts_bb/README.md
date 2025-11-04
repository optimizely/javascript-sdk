1. Create a new FX project
2. Create two flags with keys `flag_1` and `flag_2`. Each of these should have only the default `everyone else` rule. `flag_1` should have `var_1` and `flag_2` should have `var_2` for `everyone else`.
3. Create two attributes `ho` and `all`
4. Create four audiences:
  - `ho_3_aud` with condition `ho == 3 or all <= 3`
  - `ho_4_aud` with condition `ho == 4 or all <= 4`
  - `ho_5_aud` with condition `ho == 5 or all <= 5`
  - `ho_6_aud` with condition `ho == 6 or all <= 6`
5. Create four holdouts:
  - `holdout_3` with audience `ho_3_aud`, trafficAllocation 10%
  - `holdout_4` with audience `ho_4_aud`, trafficAllocation 50%
  - `holdout_5` with audience `ho_5_aud`, trafficAllocation 20%
  - `holdout_6` with audience `ho_6_aud`, trafficAllocation 40%
6. In sdk root directory, run `npm install` and then `npm run build`
7. CD to holdouts_bb directory
8. Run `npm install`
9. Copy your datafile from your project and replace the existing one in [datafile.ts file](https://github.com/optimizely/javascript-sdk/blob/7fa775df4bdc31fa4e5a021d3b226e6508135c8d/holdouts_bb/src/datafile.ts#L1)
10. Run `npm run uid`. This will list all the holdout keys and ids in the datafile. It will also output 20 user ids with the holdout keys for which the user will fall into the bucket (this list depends on holout ids and will vary from datafile to datafile)
11. Adjust [tests in index.ts](https://github.com/optimizely/javascript-sdk/blob/7fa775df4bdc31fa4e5a021d3b226e6508135c8d/holdouts_bb/src/index.ts#L164) according to your datafile and the user list from above.
12. To run a test with a specific key, run `TEST_KEY=<test-key> npm start` (replace `<test-key>` witha a valid key from the test list)
13. To run all tests, run `npm start` (make sure `TEST_KEY` env variable is empty)
14. Carefully check the test results printed, and also the sdk logs to verify that audience evaluation and bucketing are working as specified in the test.
