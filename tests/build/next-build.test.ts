/**
 * @fileoverview Build tests to catch import and compilation errors
 * 
 * @description Tests that the Next.js application can build successfully
 * without import errors, type errors, or other compilation issues.
 * @coverage Build process and module resolution
 */

import { describe, it, expect } from 'vitest';
import { execSync } from 'child_process';
import path from 'path';

describe('Next.js Build', () => {
  it('should build successfully without errors', () => {
    // CONTEXT: Test that Next.js can build the application
    // This catches import errors, type errors, and other compilation issues
    // that unit tests with mocks might miss
    
    expect(() => {
      execSync('npm run build', { 
        cwd: path.resolve(__dirname, '../..'),
        stdio: 'pipe' // Suppress output unless there's an error
      });
    }).not.toThrow();
  }, 60000); // 60 second timeout for build
});
