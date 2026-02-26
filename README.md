# 英语单词学习应用

一个简洁高效的英语单词学习Web应用，支持IELTS和CET6单词库。

## 功能特性

- 🎯 **每日单词测试**：每天自动生成25个单词进行测试
- 📊 **学习进度追踪**：记录学习进度、答错次数、掌握状态
- 🔄 **智能调度**：优先复习昨天答错的单词
- 📈 **学习统计**：显示总掌握单词数、连续学习天数、总答错次数
- 📱 **响应式设计**：支持桌面和移动设备
- 💾 **数据持久化**：使用localStorage保存学习进度
- 🎨 **美观界面**：现代化设计，流畅的动画效果

## 技术栈

- **前端框架**：原生JavaScript（无框架依赖）
- **样式**：CSS3 + CSS变量
- **存储**：localStorage API
- **发音**：Web Speech API

## 本地开发

```bash
# 启动本地服务器
python3 -m http.server 8000

# 在浏览器中访问
http://localhost:8000
```

## 部署到Vercel

1. 将项目推送到GitHub仓库
2. 在Vercel中导入项目
3. Vercel会自动检测并部署静态网站
4. 部署完成后即可访问

## 项目结构

```
├── index.html              # 主HTML文件
├── vercel.json            # Vercel配置文件
├── src/
│   ├── css/
│   │   └── style.css      # 样式文件
│   ├── data/
│   │   ├── ielts.json     # IELTS单词库
│   │   └── cet6.json      # CET6单词库
│   └── js/
│       ├── main.js        # 应用入口
│       ├── quiz.js        # 答题处理
│       ├── scheduler.js   # 单词调度
│       ├── storage.js     # 存储管理
│       ├── ui.js          # UI管理
│       ├── wordbank.js    # 单词库管理
│       └── speech.js      # 发音服务
```

## 浏览器兼容性

- Chrome (推荐)
- Firefox
- Safari
- Edge

需要支持ES6+、CSS Grid、Flexbox、localStorage和Web Speech API的现代浏览器。

## 数据格式

单词数据格式：
```json
{
  "word": "abandon",
  "translation": "放弃，遗弃",
  "phonetic": "/əˈbændən/",
  "partOfSpeech": "v."
}
```

## 性能优化

- DOM元素缓存
- DocumentFragment批量更新
- CSS硬件加速
- 请求防抖和节流
- 单词库预加载

## 许可证

MIT License