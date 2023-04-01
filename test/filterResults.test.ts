import chai, { expect } from 'chai'
import chaiAsPromised from 'chai-as-promised'
import chaiString from 'chai-string'
import fs from 'fs/promises'
import os from 'os'
import path from 'path'
import ncu from '../src/'
import stubNpmView from './helpers/stubNpmView'

chai.should()
chai.use(chaiAsPromised)
chai.use(chaiString)

describe('filterResults', () => {
  it('should return only major versions updated', async () => {
    const dependencies = { 'ncu-test-v2': '2.0.0', 'ncu-test-return-version': '1.0.0', 'ncu-test-tag': '1.0.0' }
    const stub = stubNpmView(
      {
        'ncu-test-v2': '3.0.0',
        'ncu-test-tag': '2.1.0',
        'ncu-test-return-version': '1.2.0',
      },
      { spawn: true },
    )
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'npm-check-updates-'))
    const pkgFile = path.join(tempDir, 'package.json')
    await fs.writeFile(
      pkgFile,
      JSON.stringify({
        dependencies,
      }),
      'utf-8',
    )

    try {
      const upgraded = await ncu({
        packageFile: pkgFile,
        filterResults: (
          packageName,
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          { currentVersion, currentVersionSemver, upgradedVersion, upgradedVersionSemver },
        ) => {
          const currentMajorVersion = currentVersionSemver?.[0]?.major
          const upgradedMajorVersion = upgradedVersionSemver?.major
          if (currentMajorVersion && upgradedMajorVersion) {
            return currentMajorVersion < upgradedMajorVersion
          }
          return true
        },
      })
      expect(upgraded).to.have.property('ncu-test-tag', '2.1.0')
      expect(upgraded).to.have.property('ncu-test-v2', '3.0.0')
      expect(upgraded).to.not.have.property('ncu-test-return-version')
    } finally {
      await fs.rm(tempDir, { recursive: true, force: true })
      stub.restore()
    }
  })
})
