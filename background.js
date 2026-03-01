// X Smart Unfollow - 后台服务脚本
console.log('X Smart Unfollow 后台服务启动');

// 存储用户设置
const DEFAULT_SETTINGS = {
    apiKey: '',
    confidenceThreshold: 70,
    autoSelectHighConfidence: true,
    enableCloudAnalysis: true,
    maxApiCallsPerDay: 100,
    usedApiCalls: 0,
    lastResetDate: new Date().toDateString()
};

// 初始化设置
chrome.runtime.onInstalled.addListener(() => {
    console.log('插件安装/更新');
    chrome.storage.local.get(['settings'], (result) => {
        if (!result.settings) {
            chrome.storage.local.set({ settings: DEFAULT_SETTINGS });
        } else {
            // 检查是否需要重置API调用计数
            const settings = result.settings;
            if (settings.lastResetDate !== new Date().toDateString()) {
                settings.usedApiCalls = 0;
                settings.lastResetDate = new Date().toDateString();
                chrome.storage.local.set({ settings });
            }
        }
    });
});

// 监听来自content script的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('后台收到消息:', request);
    
    if (request.action === 'callCloudAPI') {
        handleCloudAPI(request.data).then(sendResponse);
        return true; // 保持消息通道开放
    }
    
    if (request.action === 'updateProgress') {
        // 转发进度到所有popup
        chrome.runtime.sendMessage({
            action: 'progressUpdate',
            progress: request.progress
        });
    }
    
    if (request.action === 'getSettings') {
        chrome.storage.local.get(['settings'], (result) => {
            sendResponse(result.settings || DEFAULT_SETTINGS);
        });
        return true;
    }
    
    if (request.action === 'saveSettings') {
        chrome.storage.local.set({ settings: request.settings }, () => {
            sendResponse({ success: true });
        });
        return true;
    }
});

// 处理云端API调用
async function handleCloudAPI(data) {
    try {
        // 获取设置
        const settings = await getSettings();
        
        // 检查API调用限制
        if (settings.usedApiCalls >= settings.maxApiCallsPerDay) {
            throw new Error('今日API调用次数已达上限');
        }
        
        if (!settings.enableCloudAnalysis) {
            throw new Error('云端分析已禁用');
        }
        
        // 这里应该调用真实的AI API
        // 例如: OpenAI, Google AI, 或自定义API
        const analysisResult = await callAIAnalysisAPI(data);
        
        // 更新API调用计数
        settings.usedApiCalls++;
        await saveSettings(settings);
        
        return {
            success: true,
            result: analysisResult,
            remainingCalls: settings.maxApiCallsPerDay - settings.usedApiCalls
        };
        
    } catch (error) {
        console.error('云端API调用失败:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

// 模拟AI分析API调用
async function callAIAnalysisAPI(data) {
    console.log('调用AI分析API:', data);
    
    // 这里应该替换为真实的API调用
    // 示例使用模拟数据
    return new Promise(resolve => {
        setTimeout(() => {
            const { username, description, displayName } = data;
            
            // 简单的模拟分析逻辑
            let score = 50; // 基础分数
            
            // 基于文本内容分析
            const text = (description || '').toLowerCase() + ' ' + (displayName || '').toLowerCase();
            
            // 检查Crypto相关关键词
            const cryptoKeywords = [
                'bitcoin', 'crypto', 'blockchain', 'ethereum',
                '比特币', '加密货币', '数字货币', '区块链'
            ];
            
            let keywordCount = 0;
            cryptoKeywords.forEach(keyword => {
                if (text.includes(keyword)) {
                    keywordCount++;
                }
            });
            
            // 计算分数
            if (keywordCount > 0) {
                score = Math.min(70 + (keywordCount * 5), 95);
            }
            
            // 用户名检查
            if (username.toLowerCase().includes('crypto') || 
                username.toLowerCase().includes('btc') ||
                username.toLowerCase().includes('eth')) {
                score = Math.max(score, 80);
            }
            
            // 添加一些随机性模拟真实AI
            const randomAdjustment = Math.floor(Math.random() * 10) - 5;
            score = Math.max(0, Math.min(100, score + randomAdjustment));
            
            resolve({
                confidence: score,
                keywords: cryptoKeywords.filter(kw => text.includes(kw)),
                analysis: `分析完成，置信度: ${score}%`
            });
        }, 800); // 模拟网络延迟
    });
}

// 获取设置
function getSettings() {
    return new Promise((resolve) => {
        chrome.storage.local.get(['settings'], (result) => {
            resolve(result.settings || DEFAULT_SETTINGS);
        });
    });
}

// 保存设置
function saveSettings(settings) {
    return new Promise((resolve) => {
        chrome.storage.local.set({ settings }, () => {
            resolve();
        });
    });
}

// 定时任务：每日重置API调用计数
function scheduleDailyReset() {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    
    const timeUntilReset = tomorrow.getTime() - now.getTime();
    
    setTimeout(() => {
        resetApiCallCount();
        scheduleDailyReset(); // 重新调度
    }, timeUntilReset);
}

// 重置API调用计数
function resetApiCallCount() {
    chrome.storage.local.get(['settings'], (result) => {
        if (result.settings) {
            result.settings.usedApiCalls = 0;
            result.settings.lastResetDate = new Date().toDateString();
            chrome.storage.local.set({ settings: result.settings });
            console.log('API调用计数已重置');
        }
    });
}

// 启动定时任务
scheduleDailyReset();

// 监听标签页更新
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' && tab.url?.includes('x.com')) {
        console.log('X页面加载完成:', tab.url);
        // 可以在这里发送消息到content script
    }
});

// 错误处理
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'error') {
        console.error('插件错误:', request.error);
        // 可以记录错误或发送到错误跟踪服务
    }
});

console.log('X Smart Unfollow 后台服务运行中');