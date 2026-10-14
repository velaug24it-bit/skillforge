import axios from 'axios';
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
    return Boolean(env.JUDGE0_API_URL && env.JUDGE0_API_KEY);
  }

  public static async execute(
    code: string,
    language: string,
    stdin = '',
    timeLimitMs = 2000,
    memoryLimitKb = 128000
  ): Promise<ExecutionResult> {
    const langKey = language.toLowerCase();
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

    if (!this.isConfigured()) {
      return {
        success: false,
        stdout: null,
        stderr: 'Code execution service is currently unconfigured. Please configure JUDGE0_API_URL and JUDGE0_API_KEY in backend/.env.',
        compileOutput: null,
        statusId: 14,
        statusDescription: 'Execution Service Unconfigured',
        executionTimeMs: 0,
        memoryKb: 0,
        isServiceAvailable: false,
      };
    }

    try {
      const response = await axios.post(
        `${env.JUDGE0_API_URL}/submissions?base64_encoded=false&wait=true`,
        {
          source_code: code,
          language_id: languageId,
          stdin,
          cpu_time_limit: Math.max(1, timeLimitMs / 1000),
          memory_limit: memoryLimitKb,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            ...(env.JUDGE0_API_KEY && { 'X-RapidAPI-Key': env.JUDGE0_API_KEY }),
            ...(env.JUDGE0_API_HOST && { 'X-RapidAPI-Host': env.JUDGE0_API_HOST }),
          },
          timeout: 10000,
        }
      );

      const data = response.data;
      const statusId = data.status?.id || 0;
      const statusDescription = data.status?.description || 'Unknown Execution Status';
      const stdout = data.stdout ? data.stdout.trim() : null;
      const stderr = data.stderr ? data.stderr.trim() : null;
      const compileOutput = data.compile_output ? data.compile_output.trim() : null;
      const executionTimeMs = data.time ? Math.round(parseFloat(data.time) * 1000) : 0;
      const memoryKb = data.memory || 0;

      return {
        success: statusId === 3, // 3 = Accepted
        stdout,
        stderr,
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
        stderr: `Failed to connect to isolated code execution service: ${error.message}`,
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
