import { UserAttributes } from "./shared_types";
import { assert } from "chai";

describe("shared_types", () => {
    describe("UserAttributes", () => {
        it("allows any attribute to be defined", () => {
            const booleanValue: UserAttributes = {
                fixed: true,
                broken: false
            };
            const numberValue: UserAttributes = {
                first: 1,
                last: 999
            };
            const stringValue: UserAttributes = {
                name: "Rick Sanchez",
                dimension: "c137"
            };
            const nullValue: UserAttributes = {
                no: null,
                empty: null
            };
            const custom = {
                sidekick1: "Morty Smith",
                sidekick2: "Summer Smith"
            }
            const objectValue: UserAttributes = {
                custom
            };
            assert.isBoolean(booleanValue.fixed);
            assert.equal(booleanValue.broken, false);
            assert.isNumber(numberValue.last)
            assert.equal(numberValue.last, 999);
            assert.isString(stringValue.name);
            assert.equal(stringValue.dimension, "c137");
            assert.isNull(nullValue.no);
            assert.equal(nullValue.empty, null);
            assert.isObject(objectValue.custom);
            assert.equal(objectValue.custom.sidekick1, "Morty Smith");
            assert.deepEqual(objectValue.custom, custom);
        });
    });
})