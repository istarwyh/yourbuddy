/** Repository identity supplied by the trusted GitHub Actions runner. */

import process from 'node:process'

/**
 * Resolve the workflow repository independently of Project ownership.
 * @returns {{owner: string, name: string, fullName: string}} Current repository identity.
 */
export function repositoryIdentity() {
  const fullName = process.env.GITHUB_REPOSITORY
  if (!fullName || !/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(fullName)) {
    throw new Error('GITHUB_REPOSITORY must identify the workflow owner/repository')
  }
  const [owner, name] = fullName.split('/')
  return { owner, name, fullName }
}
