#!/bin/bash
# 阿里云 ECS / 轻量应用服务器 一键部署脚本
# 在服务器上执行: bash deploy.sh

set -e

echo "📦 安装 Node.js 24..."
if ! command -v node &> /dev/null; then
  curl -fsSL https://deb.nodesource.com/setup_24.x | sudo -E bash -
  sudo apt-get install -y nodejs
fi

echo "✅ Node.js: $(node -v)"

echo "📦 安装 PM2（进程守护）..."
sudo npm install -g pm2 --registry=https://registry.npmmirror.com

echo "📥 安装依赖..."
npm install --registry=https://registry.npmmirror.com

echo "🔨 构建项目..."
npm run build

echo "🚀 启动服务（端口 3000）..."
pm2 delete voice-notes 2>/dev/null || true
pm2 start npm --name voice-notes -- run start

echo "💾 保存 PM2 进程列表（开机自启）..."
pm2 save
pm2 startup

echo ""
echo "✅ 部署完成！"
echo "访问地址: http://$(curl -s ifconfig.me):3000"
echo ""
echo "⚠️  别忘了设置环境变量:"
echo "  export DEEPSEEK_API_KEY=sk-your-key"
echo "  然后重启: pm2 restart voice-notes"
