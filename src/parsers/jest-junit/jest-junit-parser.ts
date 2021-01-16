import {Annotation, FileContent, ParseOptions, TestResult} from '../parser-types'
import {parseStringPromise} from 'xml2js'

import {JunitReport, TestCase, TestSuite} from './jest-junit-types'
import {fixEol, Icon} from '../../utils/markdown-utils'
import {normalizeFilePath} from '../../utils/file-utils'
import {parseAttribute} from '../../utils/xml-utils'

import {
  TestExecutionResult,
  TestRunResult,
  TestSuiteResult,
  TestGroupResult,
  TestCaseResult
} from '../../report/test-results'
import getReport from '../../report/get-report'

export async function parseJestJunit(files: FileContent[], options: ParseOptions): Promise<TestResult> {
  const junit: JunitReport[] = []
  const testRuns: TestRunResult[] = []

  for (const file of files) {
    const ju = await getJunitReport(file.content)
    const tr = getTestRunResult(file.path, ju)
    junit.push(ju)
    testRuns.push(tr)
  }

  const success = testRuns.every(tr => tr.result === 'success')
  const icon = success ? Icon.success : Icon.fail

  return {
    success,
    output: {
      title: `${options.name.trim()} ${icon}`,
      summary: getReport(testRuns),
      annotations: options.annotations ? getAnnotations(junit, options.workDir, options.trackedFiles) : undefined
    }
  }
}

async function getJunitReport(content: string): Promise<JunitReport> {
  return (await parseStringPromise(content, {
    attrValueProcessors: [parseAttribute]
  })) as JunitReport
}

function getTestRunResult(path: string, junit: JunitReport): TestRunResult {
  const suites = junit.testsuites.testsuite.map(ts => {
    const name = ts.$.name.trim()
    const time = ts.$.time * 1000
    const sr = new TestSuiteResult(name, getGroups(ts), time)
    return sr
  })

  const time = junit.testsuites.$.time * 1000
  return new TestRunResult(path, suites, time)
}

function getGroups(suite: TestSuite): TestGroupResult[] {
  const groups: {describe: string; tests: TestCase[]}[] = []
  for (const tc of suite.testcase) {
    let grp = groups.find(g => g.describe === tc.$.classname)
    if (grp === undefined) {
      grp = {describe: tc.$.classname, tests: []}
      groups.push(grp)
    }
    grp.tests.push(tc)
  }

  return groups.map(grp => {
    const tests = grp.tests.map(tc => {
      const name = tc.$.name.trim()
      const result = getTestCaseResult(tc)
      const time = tc.$.time * 1000
      return new TestCaseResult(name, result, time)
    })
    return new TestGroupResult(grp.describe, tests)
  })
}

function getTestCaseResult(test: TestCase): TestExecutionResult {
  if (test.failure) return 'failed'
  if (test.skipped) return 'skipped'
  return 'success'
}

function getAnnotations(junitReports: JunitReport[], workDir: string, trackedFiles: string[]): Annotation[] {
  const annotations: Annotation[] = []
  for (const junit of junitReports) {
    for (const suite of junit.testsuites.testsuite) {
      for (const tc of suite.testcase) {
        if (!tc.failure) {
          continue
        }
        for (const ex of tc.failure) {
          const src = exceptionThrowSource(ex, workDir, trackedFiles)
          if (src === null) {
            continue
          }
          annotations.push({
            annotation_level: 'failure',
            start_line: src.line,
            end_line: src.line,
            path: src.file,
            message: fixEol(ex),
            title: `[${suite.$.name}] ${tc.$.name.trim()}`
          })
        }
      }
    }
  }
  return annotations
}

export function exceptionThrowSource(
  ex: string,
  workDir: string,
  trackedFiles: string[]
): {file: string; line: number; column: number} | null {
  const lines = ex.split(/\r?\n/)
  const re = /\((.*):(\d+):(\d+)\)$/

  for (const str of lines) {
    const match = str.match(re)
    if (match !== null) {
      const [_, fileStr, lineStr, colStr] = match
      const filePath = normalizeFilePath(fileStr)
      const file = filePath.startsWith(workDir) ? filePath.substr(workDir.length) : filePath
      if (trackedFiles.includes(file)) {
        const line = parseInt(lineStr)
        const column = parseInt(colStr)
        return {file, line, column}
      }
    }
  }

  return null
}