// Batch 8A — locate a JDK 21 for Gradle (Capacitor 8 compiles with Java 21; this machine's
// default JAVA_HOME is Android Studio's JBR, which is Java 25). Nothing system-wide is
// changed: the path found here is passed as JAVA_HOME to the gradle child process only.
// Search order: KS_JAVA_HOME, JAVA_HOME, ~/.jdks/*, Android Studio's bundled JBR.
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

function major(home) {
  try {
    const m = readFileSync(join(home, 'release'), 'utf8').match(/^JAVA_VERSION="?(\d+)/m)
    return m ? Number(m[1]) : null
  } catch { return null }
}

export function findJdk21() {
  const candidates = [process.env.KS_JAVA_HOME, process.env.JAVA_HOME]
  const jdks = join(homedir(), '.jdks')
  if (existsSync(jdks)) for (const d of readdirSync(jdks).sort().reverse()) candidates.push(join(jdks, d))
  candidates.push('C:\Program Files\Android\Android Studio\jbr', '/Applications/Android Studio.app/Contents/jbr/Contents/Home', '/opt/android-studio/jbr')
  for (const c of candidates) if (c && major(c) === 21) return c
  return null
}

export function findSdk() {
  const candidates = [process.env.ANDROID_HOME, process.env.ANDROID_SDK_ROOT, process.env.LOCALAPPDATA && join(process.env.LOCALAPPDATA, 'Android', 'Sdk'), join(homedir(), 'Android', 'Sdk'), join(homedir(), 'Library', 'Android', 'sdk')]
  return candidates.find((c) => c && existsSync(join(c, 'platform-tools'))) || null
}

if (process.argv[1] && process.argv[1].endsWith('find-jdk.mjs')) {
  const jdk = findJdk21()
  if (!jdk) { console.error('No JDK 21 found. Install one (e.g. Temurin 21) or set KS_JAVA_HOME.'); process.exit(1) }
  console.log(jdk)
}
