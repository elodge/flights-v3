/**
 * @fileoverview TypeScript compilation tests
 * 
 * @description Tests that all TypeScript files compile without errors,
 * catching import issues and type mismatches that mocks might hide.
 * @coverage TypeScript compilation and type checking
 */

import { describe, it, expect } from 'vitest';
import { execSync } from 'child_process';
import path from 'path';

describe('TypeScript Compilation', () => {
  it('should compile all TypeScript files without errors', () => {
    // CONTEXT: Test that TypeScript can compile all files
    // This catches import errors and type issues that unit tests miss
    
    expect(() => {
      execSync('npx tsc --noEmit', { 
        cwd: path.resolve(__dirname, '../..'),
        stdio: 'pipe' // Suppress output unless there's an error
      });
    }).not.toThrow();
  }, 30000); // 30 second timeout for type check
});
