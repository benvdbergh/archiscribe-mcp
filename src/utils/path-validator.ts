/**
 * Path Validation Utilities
 * 
 * Provides secure path validation to prevent directory traversal attacks
 * and unauthorized file system access.
 * 
 * @module utils/path-validator
 */

import { existsSync, statSync, accessSync, constants } from 'fs';
import { resolve, normalize, isAbsolute, dirname } from 'path';
import { getLogger } from './logger';

const logger = getLogger();

/**
 * Path validation result
 */
export interface PathValidationResult {
  valid: boolean;
  error?: string;
  resolvedPath?: string;
}

/**
 * Path validation options
 */
export interface PathValidationOptions {
  /** Allowed directories whitelist (optional, for production) */
  allowedDirectories?: string[];
  /** Whether to check file exists */
  checkExists?: boolean;
  /** Whether to check file is readable */
  checkReadable?: boolean;
  /** Whether path must be a file (not directory) */
  mustBeFile?: boolean;
  /** Base directory for relative paths */
  baseDirectory?: string;
}

/**
 * Validate and sanitize a file path
 * 
 * Prevents directory traversal attacks and validates file access permissions.
 * 
 * @param path Path to validate
 * @param options Validation options
 * @returns Validation result
 */
export function validatePath(path: string, options: PathValidationOptions = {}): PathValidationResult {
  const opts = {
    checkExists: true,
    checkReadable: true,
    mustBeFile: true,
    ...options
  };

  // Check for empty/null path
  if (!path || typeof path !== 'string' || path.trim() === '') {
    return {
      valid: false,
      error: 'Path cannot be empty'
    };
  }

  // Normalize path to handle any encoding issues
  let normalizedPath = normalize(path.trim());

  // Check for directory traversal attempts
  if (containsTraversal(normalizedPath)) {
    logger.log('warn', 'path.validation.traversal.attempt', { path: normalizedPath });
    return {
      valid: false,
      error: 'Path contains invalid traversal sequences'
    };
  }

  // Resolve to absolute path
  let resolvedPath: string;
  if (isAbsolute(normalizedPath)) {
    resolvedPath = resolve(normalizedPath);
  } else {
    const baseDir = opts.baseDirectory || process.cwd();
    resolvedPath = resolve(baseDir, normalizedPath);
  }

  // Normalize again after resolution to catch any remaining issues
  resolvedPath = normalize(resolvedPath);

  // Check against whitelist if configured
  if (opts.allowedDirectories && opts.allowedDirectories.length > 0) {
    const isAllowed = opts.allowedDirectories.some(allowedDir => {
      const resolvedAllowed = resolve(allowedDir);
      return resolvedPath.startsWith(resolvedAllowed + '/') || resolvedPath === resolvedAllowed;
    });

    if (!isAllowed) {
      logger.log('warn', 'path.validation.whitelist.violation', { path: resolvedPath });
      return {
        valid: false,
        error: 'Path is not within allowed directories'
      };
    }
  }

  // Check file exists
  if (opts.checkExists) {
    if (!existsSync(resolvedPath)) {
      return {
        valid: false,
        error: 'File does not exist'
      };
    }
  }

  // Check file is readable
  if (opts.checkReadable) {
    try {
      accessSync(resolvedPath, constants.R_OK);
    } catch (err) {
      return {
        valid: false,
        error: 'File is not readable'
      };
    }
  }

  // Check path is a file (not directory)
  if (opts.mustBeFile) {
    try {
      const stats = statSync(resolvedPath);
      if (!stats.isFile()) {
        return {
          valid: false,
          error: 'Path must be a file, not a directory'
        };
      }
    } catch (err) {
      return {
        valid: false,
        error: 'Cannot access file information'
      };
    }
  }

  return {
    valid: true,
    resolvedPath
  };
}

/**
 * Check if path contains directory traversal sequences
 * 
 * Detects various forms of directory traversal:
 * - ../ (Unix)
 * - ..\\ (Windows)
 * - Encoded variants (%2e%2e%2f, etc.)
 * - Double-encoded variants
 * - Unicode variants
 */
function containsTraversal(path: string): boolean {
  // Check for common traversal patterns
  const traversalPatterns = [
    /\.\.\//g,           // ../
    /\.\.\\/g,           // ..\
    /\.\.%2f/gi,         // ..%2f (encoded)
    /\.\.%5c/gi,         // ..%5c (encoded backslash)
    /%2e%2e%2f/gi,       // %2e%2e%2f (double encoded)
    /%2e%2e%5c/gi,       // %2e%2e%5c (double encoded backslash)
    /%252e%252e%252f/gi, // %252e%252e%252f (triple encoded)
    /\.\.%c0%af/gi,      // Unicode variant
    /\.\.%c1%9c/gi,      // Unicode variant
  ];

  for (const pattern of traversalPatterns) {
    if (pattern.test(path)) {
      return true;
    }
  }

  // Check for path manipulation after normalization
  // If path contains .. after normalization, it's suspicious
  const normalized = normalize(path);
  if (normalized.includes('..')) {
    return true;
  }

  return false;
}

/**
 * Validate path for model file operations
 * 
 * Convenience function with defaults for ArchiMate model file validation
 */
export function validateModelPath(path: string, allowedDirectories?: string[]): PathValidationResult {
  return validatePath(path, {
    allowedDirectories,
    checkExists: true,
    checkReadable: true,
    mustBeFile: true
  });
}

