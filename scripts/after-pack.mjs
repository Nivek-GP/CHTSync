import { execSync } from 'child_process'
import path from 'path'

export default async function afterSign(context) {
  if (context.electronPlatformName !== 'darwin') return

  const appPath = path.join(context.appOutDir, `${context.packager.appInfo.productName}.app`)
  execSync(`codesign --force --deep --sign - "${appPath}"`)
}
