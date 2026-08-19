import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // CLAUDE.md はこのプロジェクト専用の手動管理ファイルのため、
  // `next dev` によるNext.js向け注意書きの自動追記を無効化する
  agentRules: false,
};

export default nextConfig;
