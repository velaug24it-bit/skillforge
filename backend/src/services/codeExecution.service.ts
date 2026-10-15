import axios from 'axios';
import { spawn } from 'child_process';
import { env } from '../config/env';

export interface ExecutionResult {
  success: boolean;
  stdout: string | null;
  stderr: string | null;
  compileOutput: string | null;
  statusId: number;
  statusDescription: string;
  executionTimeMs: number;
  memoryKb: number;
  isServiceAvailable: boolean;
}

// Judge0 Standard Language IDs
const LANGUAGE_IDS: Record<string, number> = {
  c: 50,          // C (GCC 9.2.0)
  cpp: 54,        // C++ (GCC 9.2.0)
  java: 62,       // Java (OpenJDK 13.0.1)
  python: 71,     // Python (3.8.1)
  javascript: 63, // JavaScript (Node.js 12.14.0)
};

export class CodeExecutionService {
  public static isConfigured(): boolean {
    return true;
  }

  /**
   * Fast, zero-network local execution for Python and JavaScript
   */
  private static async executeLocally(
    code: string,
    language: string,
    stdin: string,
    timeLimitMs: number
  ): Promise<ExecutionResult | null> {
    const lang = language.toLowerCase();
    let command = '';
    let args: string[] = [];

    if (lang === 'python') {
      command = 'python';
      args = ['-c', code];
    } else if (lang === 'javascript') {
      command = 'node';
      args = ['-e', code];
    } else {
      return null;
    }

    return new Promise((resolve) => {
      const startTime = Date.now();
      let stdout = '';
      let stderr = '';
      let killed = false;

      let child;
      try {
        child = spawn(command, args, { stdio: ['pipe', 'pipe', 'pipe'] });
      } catch {
        return resolve(null);
      }

      const timer = setTimeout(() => {
        killed = true;
        child.kill();
        resolve({
          success: false,
          stdout: null,
          stderr: 'Time Limit Exceeded (Execution timed out)',
          compileOutput: null,
          statusId: 5,
          statusDescription: 'Time Limit Exceeded',
          executionTimeMs: timeLimitMs,
          memoryKb: 0,
          isServiceAvailable: true,
        });
      }, timeLimitMs);

      child.stdout.on('data', (d) => { stdout += d.toString(); });
      child.stderr.on('data', (d) => { stderr += d.toString(); });

      child.on('error', () => {
        clearTimeout(timer);
        resolve(null);
      });

      child.on('close', (code) => {
        clearTimeout(timer);
        if (killed) return;
        const executionTimeMs = Date.now() - startTime;
        const cleanStdout = stdout ? stdout.trim() : null;
        const cleanStderr = stderr ? stderr.trim() : null;

        resolve({
          success: code === 0,
          stdout: cleanStdout,
          stderr: code === 0 ? null : cleanStderr,
          compileOutput: null,
          statusId: code === 0 ? 3 : 11,
          statusDescription: code === 0 ? 'Accepted' : 'Runtime Error',
          executionTimeMs,
          memoryKb: 0,
          isServiceAvailable: true,
        });
      });

      if (stdin) {
        try {
          child.stdin.write(stdin);
          child.stdin.end();
        } catch {
          // ignore
        }
      } else {
        child.stdin.end();
      }
    });
  }

  public static async execute(
    code: string,
    language: string,
    stdin = '',
    timeLimitMs = 8000,
    memoryLimitKb = 128000
  ): Promise<ExecutionResult> {
    const langKey = language.toLowerCase();

    // 1. If Python or JavaScript, attempt immediate, fast local execution first
    if (langKey === 'python' || langKey === 'javascript') {
      try {
        const localRes = await this.executeLocally(code, langKey, stdin, timeLimitMs);
        if (localRes) {
          return localRes;
        }
      } catch {
        // Fall back to Judge0 CE
      }
    }

    const languageId = LANGUAGE_IDS[langKey];
    if (!languageId) {
      return {
        success: false,
        stdout: null,
        stderr: `Unsupported programming language: ${language}`,
        compileOutput: null,
        statusId: 13,
        statusDescription: 'Internal Error: Language Unsupported',
        executionTimeMs: 0,
        memoryKb: 0,
        isServiceAvailable: true,
      };
    }

    // 2. Execute via Judge0 CE (ce.judge0.com)
    const apiUrl = (env.JUDGE0_API_URL || 'https://ce.judge0.com').replace(/\/+$/, '');

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (env.JUDGE0_API_KEY) {
        headers['X-RapidAPI-Key'] = env.JUDGE0_API_KEY;
      }
      if (env.JUDGE0_API_HOST) {
        headers['X-RapidAPI-Host'] = env.JUDGE0_API_HOST;
      }

      const response = await axios.post(
        `${apiUrl}/submissions?base64_encoded=false&wait=true`,
        {
          source_code: code,
          language_id: languageId,
          stdin,
          cpu_time_limit: Math.max(1, Math.ceil(timeLimitMs / 1000)),
          memory_limit: memoryLimitKb,
        },
        {
          headers,
          timeout: 15000,
        }
      );

      const data = response.data;
      const statusId = data.status?.id || 0;
      const statusDescription = data.status?.description || 'Unknown Execution Status';
      const stdout = data.stdout ? data.stdout.trim() : null;
      const compileOutput = data.compile_output ? data.compile_output.trim() : null;
      const stderr = compileOutput || (data.stderr ? data.stderr.trim() : null) || (data.message ? data.message.trim() : null);
      const executionTimeMs = data.time ? Math.round(parseFloat(data.time) * 1000) : 0;
      const memoryKb = data.memory || 0;

      return {
        success: statusId === 3, // 3 = Accepted
        stdout,
        stderr: statusId === 3 ? null : stderr,
        compileOutput,
        statusId,
        statusDescription,
        executionTimeMs,
        memoryKb,
        isServiceAvailable: true,
      };
    } catch (error: any) {
      console.error('[CodeExecutionService] Judge0 API request failed:', error.message);
      return {
        success: false,
        stdout: null,
        stderr: `Code execution error: ${error.response?.data?.error || error.message}`,
        compileOutput: null,
        statusId: 15,
        statusDescription: 'Code Execution Engine Unreachable',
        executionTimeMs: 0,
        memoryKb: 0,
        isServiceAvailable: false,
      };
    }
  }
}
