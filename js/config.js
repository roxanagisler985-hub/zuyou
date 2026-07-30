/**
 * 宿友 - AI API 配置
 *
 * 两种模式：
 *
 * 模式一：直连硅基流动（最简单，直接填 API Key）
 *   注册：https://cloud.siliconflow.cn
 *   USE_PROXY: true, API_KEY: 'sk-你的Key'
 *
 * 模式二：Cloudflare Workers 代理（推荐，Key 存服务端）
 *   部署 workers/worker.js 到 Cloudflare
 *   USE_PROXY: true, PROXY_URL: 'https://你的域名.workers.dev'
 *
 * 免费模型：
 * - Qwen/Qwen2.5-7B-Instruct（推荐，速度最快）
 * - deepseek-ai/DeepSeek-V2.5
 */

const SILICONFLOW_CONFIG = {
  // === 模式选择 ===
  USE_PROXY: true,             // ✅ 已切换到 Cloudflare Workers 代理

  // === 模式一：直连硅基流动（USE_PROXY: true 时生效） ===
  API_KEY: '',                  // 代理模式不需要 Key

  // === 模式二：Cloudflare Workers 代理（USE_PROXY: true 时生效） ===
  PROXY_URL: 'https://zuyou-proxy.roxanagisler985.workers.dev',

  // === 通用配置 ===
  MODEL: 'Qwen/Qwen2.5-7B-Instruct',
  USE_REAL_API: true
};
