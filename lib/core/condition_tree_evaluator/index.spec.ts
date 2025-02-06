/**
 * Copyright 2025, Optimizely
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import { describe, it, vi, expect } from 'vitest';

import * as conditionTreeEvaluator from '.';

const conditionA = {
  name: 'browser_type',
  value: 'safari',
  type: 'custom_attribute',
};
const conditionB = {
  name: 'device_model',
  value: 'iphone6',
  type: 'custom_attribute',
};
const conditionC = {
  name: 'location',
  match: 'exact',
  type: 'custom_attribute',
  value: 'CA',
};
describe('evaluate', function() {
  it('should return true for a leaf condition when the leaf condition evaluator returns true', function() {
    expect(
      conditionTreeEvaluator.evaluate(conditionA, function() {
        return true;
      })
    ).toBe(true);
  });

  it('should return false for a leaf condition when the leaf condition evaluator returns false', function() {
    expect(
      conditionTreeEvaluator.evaluate(conditionA, function() {
        return false;
      })
    ).toBe(false);
  });

  describe('and evaluation', function() {
    it('should return true when ALL conditions evaluate to true', function() {
      expect(
        conditionTreeEvaluator.evaluate(['and', conditionA, conditionB], function() {
          return true;
        })
      ).toBe(true);
    });

    it('should return false if one condition evaluates to false', function() {
      const leafEvaluator = vi.fn();
      leafEvaluator.mockImplementationOnce(() => true).mockImplementationOnce(() => false);
      expect(conditionTreeEvaluator.evaluate(['and', conditionA, conditionB], leafEvaluator)).toBe(false);
    });

    describe('null handling', function() {
      it('should return null when all operands evaluate to null', function() {
        expect(
          conditionTreeEvaluator.evaluate(['and', conditionA, conditionB], function() {
            return null;
          })
        ).toBeNull();
      });

      it('should return null when operands evaluate to trues and nulls', function() {
        const leafEvaluator = vi.fn();
        leafEvaluator.mockImplementationOnce(() => true).mockImplementationOnce(() => null);
        expect(conditionTreeEvaluator.evaluate(['and', conditionA, conditionB], leafEvaluator)).toBeNull();
      });

      it('should return false when operands evaluate to falses and nulls', function() {
        const leafEvaluator = vi.fn();
        leafEvaluator.mockImplementationOnce(() => false).mockImplementationOnce(() => null);
        expect(conditionTreeEvaluator.evaluate(['and', conditionA, conditionB], leafEvaluator)).toBe(false);

        leafEvaluator.mockReset();
        leafEvaluator.mockImplementationOnce(() => null).mockImplementationOnce(() => false);
        expect(conditionTreeEvaluator.evaluate(['and', conditionA, conditionB], leafEvaluator)).toBe(false);
      });

      it('should return false when operands evaluate to trues, falses, and nulls', function() {
        const leafEvaluator = vi.fn();
        leafEvaluator
          .mockImplementationOnce(() => true)
          .mockImplementationOnce(() => false)
          .mockImplementationOnce(() => null);
        expect(conditionTreeEvaluator.evaluate(['and', conditionA, conditionB, conditionC], leafEvaluator)).toBe(false);
      });
    });
  });

  describe('or evaluation', function() {
    it('should return true if any condition evaluates to true', function() {
      const leafEvaluator = vi.fn();
      leafEvaluator.mockImplementationOnce(() => false).mockImplementationOnce(() => true);
      expect(conditionTreeEvaluator.evaluate(['or', conditionA, conditionB], leafEvaluator)).toBe(true);
    });

    it('should return false if all conditions evaluate to false', function() {
      expect(
        conditionTreeEvaluator.evaluate(['or', conditionA, conditionB], function() {
          return false;
        })
      ).toBe(false);
    });

    describe('null handling', function() {
      it('should return null when all operands evaluate to null', function() {
        expect(
          conditionTreeEvaluator.evaluate(['or', conditionA, conditionB], function() {
            return null;
          })
        ).toBeNull();
      });

      it('should return true when operands evaluate to trues and nulls', function() {
        const leafEvaluator = vi.fn();
        leafEvaluator.mockImplementationOnce(() => true).mockImplementationOnce(() => null);
        expect(conditionTreeEvaluator.evaluate(['or', conditionA, conditionB], leafEvaluator)).toBe(true);
      });

      it('should return null when operands evaluate to falses and nulls', function() {
        const leafEvaluator = vi.fn();
        leafEvaluator.mockImplementationOnce(() => null).mockImplementationOnce(() => false);
        expect(conditionTreeEvaluator.evaluate(['or', conditionA, conditionB], leafEvaluator)).toBeNull();

        leafEvaluator.mockReset();
        leafEvaluator.mockImplementationOnce(() => false).mockImplementationOnce(() => null);
        expect(conditionTreeEvaluator.evaluate(['or', conditionA, conditionB], leafEvaluator)).toBeNull();
      });

      it('should return true when operands evaluate to trues, falses, and nulls', function() {
        const leafEvaluator = vi.fn();
        leafEvaluator
          .mockImplementationOnce(() => true)
          .mockImplementationOnce(() => null)
          .mockImplementationOnce(() => false);
        expect(conditionTreeEvaluator.evaluate(['or', conditionA, conditionB, conditionC], leafEvaluator)).toBe(true);
      });
    });
  });

  describe('not evaluation', function() {
    it('should return true if the condition evaluates to false', function() {
      expect(
        conditionTreeEvaluator.evaluate(['not', conditionA], function() {
          return false;
        })
      ).toBe(true);
    });

    it('should return false if the condition evaluates to true', function() {
      expect(
        conditionTreeEvaluator.evaluate(['not', conditionB], function() {
          return true;
        })
      ).toBe(false);
    });

    it('should return the result of negating the first condition, and ignore any additional conditions', function() {
      let result = conditionTreeEvaluator.evaluate(['not', '1', '2', '1'], function(id: string) {
        return id === '1';
      });
      expect(result).toBe(false);
      result = conditionTreeEvaluator.evaluate(['not', '1', '2', '1'], function(id: string) {
        return id === '2';
      });
      expect(result).toBe(true);
      result = conditionTreeEvaluator.evaluate(['not', '1', '2', '3'], function(id: string) {
        return id === '1' ? null : id === '3';
      });
      expect(result).toBeNull();
    });

    describe('null handling', function() {
      it('should return null when operand evaluates to null', function() {
        expect(
          conditionTreeEvaluator.evaluate(['not', conditionA], function() {
            return null;
          })
        ).toBeNull();
      });

      it('should return null when there are no operands', function() {
        expect(
          conditionTreeEvaluator.evaluate(['not'], function() {
            return null;
          })
        ).toBeNull();
      });
    });
  });

  describe('implicit operator', function() {
    it('should behave like an "or" operator when the first item in the array is not a recognized operator', function() {
      const leafEvaluator = vi.fn();
      leafEvaluator.mockImplementationOnce(() => true).mockImplementationOnce(() => false);
      expect(conditionTreeEvaluator.evaluate([conditionA, conditionB], leafEvaluator)).toBe(true);
      expect(
        conditionTreeEvaluator.evaluate([conditionA, conditionB], function() {
          return false;
        })
      ).toBe(false);
    });
  });
});
