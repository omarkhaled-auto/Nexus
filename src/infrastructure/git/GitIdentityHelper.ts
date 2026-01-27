/**
 * Git Identity Helper
 *
 * Ensures git user.name and user.email are configured for commits.
 * Auto-configures local identity if global identity is not set.
 *
 * This solves the common error:
 * "Author identity unknown - Please tell me who you are"
 */

import { execSync } from 'child_process';

/**
 * Git identity configuration
 */
export interface GitIdentity {
  name: string;
  email: string;
}

/**
 * Default identity for Nexus-generated commits
 */
const DEFAULT_NEXUS_IDENTITY: GitIdentity = {
  name: 'Nexus Agent',
  email: 'nexus@localhost',
};

/**
 * Check if git identity is configured (local or global)
 *
 * @param cwd - Working directory (repository path)
 * @returns Object with name and email if configured, null values if not
 */
export function checkGitIdentity(cwd: string): { name: string | null; email: string | null } {
  let name: string | null = null;
  let email: string | null = null;

  try {
    // Check local config first, then global
    name = execSync('git config user.name', {
      cwd,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim();
  } catch {
    // Not configured
  }

  try {
    email = execSync('git config user.email', {
      cwd,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim();
  } catch {
    // Not configured
  }

  return { name: name || null, email: email || null };
}

/**
 * Check if git identity is fully configured
 *
 * @param cwd - Working directory (repository path)
 * @returns true if both name and email are configured
 */
export function hasGitIdentity(cwd: string): boolean {
  const { name, email } = checkGitIdentity(cwd);
  return Boolean(name && email);
}

/**
 * Configure local git identity for a repository
 *
 * @param cwd - Working directory (repository path)
 * @param identity - Identity to configure
 */
export function configureLocalIdentity(cwd: string, identity: GitIdentity): void {
  execSync(`git config --local user.name "${identity.name}"`, {
    cwd,
    encoding: 'utf-8',
    stdio: ['pipe', 'pipe', 'pipe'],
  });

  execSync(`git config --local user.email "${identity.email}"`, {
    cwd,
    encoding: 'utf-8',
    stdio: ['pipe', 'pipe', 'pipe'],
  });

  console.log(`[GitIdentityHelper] Configured local identity: ${identity.name} <${identity.email}>`);
}

/**
 * Ensure git identity is configured before commit operations
 *
 * If no identity is configured (neither local nor global), this will
 * auto-configure a local identity using the project name.
 *
 * @param cwd - Working directory (repository path)
 * @param projectName - Project name to use in default identity
 * @returns The identity being used (existing or newly configured)
 */
export function ensureIdentityForCommit(cwd: string, projectName?: string): GitIdentity {
  const existing = checkGitIdentity(cwd);

  // If both are configured, use existing
  if (existing.name && existing.email) {
    return {
      name: existing.name,
      email: existing.email,
    };
  }

  // Generate default identity
  const identity: GitIdentity = {
    name: existing.name || DEFAULT_NEXUS_IDENTITY.name,
    email: existing.email || generateProjectEmail(projectName),
  };

  // Only configure what's missing
  if (!existing.name) {
    execSync(`git config --local user.name "${identity.name}"`, {
      cwd,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
  }

  if (!existing.email) {
    execSync(`git config --local user.email "${identity.email}"`, {
      cwd,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
  }

  console.log(`[GitIdentityHelper] Auto-configured identity: ${identity.name} <${identity.email}>`);
  return identity;
}

/**
 * Generate a project-specific email for Nexus commits
 */
function generateProjectEmail(projectName?: string): string {
  if (projectName) {
    // Sanitize project name for email
    const sanitized = projectName
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
    return `nexus+${sanitized}@localhost`;
  }
  return DEFAULT_NEXUS_IDENTITY.email;
}

/**
 * Try to get the current user's identity from git global config or system
 * Falls back to default Nexus identity if not available
 */
export function getSystemUserIdentity(): GitIdentity {
  let name: string | null = null;
  let email: string | null = null;

  try {
    name = execSync('git config --global user.name', {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim();
  } catch {
    // Not configured
  }

  try {
    email = execSync('git config --global user.email', {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim();
  } catch {
    // Not configured
  }

  return {
    name: name || DEFAULT_NEXUS_IDENTITY.name,
    email: email || DEFAULT_NEXUS_IDENTITY.email,
  };
}
