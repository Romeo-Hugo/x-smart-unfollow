#!/bin/bash
# 创建简单的SVG图标
mkdir -p icons

# 16x16 图标
cat > icons/icon16.svg << 'SVG16'
<svg width="16" height="16" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
  <rect width="16" height="16" rx="3" fill="#1DA1F2"/>
  <path d="M4 8 L8 4 L12 8 L10 8 L10 12 L6 12 L6 8 Z" fill="white"/>
  <path d="M8 4 L12 8 L10 8 L10 12 L6 12 L6 8 L4 8 Z" fill="white" opacity="0.8"/>
</svg>
SVG16

# 48x48 图标  
cat > icons/icon48.svg << 'SVG48'
<svg width="48" height="48" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
  <rect width="48" height="48" rx="8" fill="linear-gradient(135deg, #1DA1F2, #794BC4)"/>
  <path d="M12 24 L24 12 L36 24 L30 24 L30 36 L18 36 L18 24 Z" fill="white"/>
  <path d="M24 12 L36 24 L30 24 L30 36 L18 36 L18 24 L12 24 Z" fill="white" opacity="0.8"/>
  <circle cx="24" cy="24" r="20" fill="none" stroke="white" stroke-width="2" opacity="0.3"/>
</svg>
SVG48

# 128x128 图标
cat > icons/icon128.svg << 'SVG128'
<svg width="128" height="128" viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg">
  <rect width="128" height="128" rx="16" fill="linear-gradient(135deg, #1DA1F2, #794BC4)"/>
  <path d="M32 64 L64 32 L96 64 L80 64 L80 96 L48 96 L48 64 Z" fill="white"/>
  <path d="M64 32 L96 64 L80 64 L80 96 L48 96 L48 64 L32 64 Z" fill="white" opacity="0.8"/>
  <circle cx="64" cy="64" r="56" fill="none" stroke="white" stroke-width="4" opacity="0.2"/>
  <circle cx="64" cy="64" r="48" fill="none" stroke="white" stroke-width="2" opacity="0.3"/>
</svg>
SVG128

# 转换为PNG（使用convert或简单base64）
echo "iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAACXBIWXMAAAsTAAALEwEAmpwYAAAA" > icons/icon16.png.base64
echo "请在实际环境中使用图像编辑工具创建PNG图标" > icons/README_ICONS.txt

echo "✅ 图标SVG文件已创建"
echo "⚠️ 注意：在实际部署前需要将SVG转换为PNG格式"
