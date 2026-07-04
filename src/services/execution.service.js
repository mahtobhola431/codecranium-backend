import { env } from '../config/env.js'
import { ApiError } from '../utils/ApiError.js'

// Our CodeLanguage values -> Judge0 `language_id` (ce.judge0.com /languages).
// Pinned to specific versions so behaviour doesn't shift under us.
const JUDGE0_LANGUAGE_ID = {
  javascript: 102, // Node.js 22.08.0
  typescript: 101, // TypeScript 5.6.2
  python: 109, // Python 3.13.2
  rust: 108, // Rust 1.85.0
  go: 107, // Go 1.23.5
  bash: 46, // Bash 5.0.0
}

// Judge0 status ids: 1-2 queued/processing, 3 accepted, 4 wrong answer (unused,
// no expected output here), 5 TLE, 6 compile error, 7-12 runtime errors, 13 internal error, 14 exec format error.
const describeStatus = (status) => status?.description ?? 'Unknown'

/** Runs untrusted user code via Judge0 CE and returns stdout/stderr/compile output. */
export const execute = async ({ language, code, stdin = '' }) => {
  const languageId = JUDGE0_LANGUAGE_ID[language]
  if (!languageId) throw new ApiError(400, `${language} isn't supported by the execution service`)

  let res
  try {
    res = await fetch(`${env.JUDGE0_API_URL}/submissions?base64_encoded=false&wait=true`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        language_id: languageId,
        source_code: code,
        stdin,
      }),
    })
  } catch {
    throw new ApiError(502, 'Could not reach the code execution service')
  }

  if (res.status === 429) {
    throw new ApiError(429, 'The execution service is busy — try again in a moment')
  }
  if (!res.ok) {
    throw new ApiError(502, 'Code execution failed unexpectedly')
  }

  const data = await res.json()
  return {
    language,
    status: describeStatus(data.status),
    accepted: data.status?.id === 3,
    stdout: data.stdout ?? '',
    stderr: data.stderr ?? '',
    compileOutput: data.compile_output ?? '',
    time: data.time,
    memory: data.memory,
  }
}
