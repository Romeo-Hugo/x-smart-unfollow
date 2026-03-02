// X Smart Unfollow - 内容脚本（纯DeepSeek AI分析版本）
console.log('X Smart Unfollow AI版内容脚本已加载');

// DeepSeek API 配置
const DEEPSEEK_CONFIG = {
    apiKey: 'sk-a2b12f5fb18d4b419edb973638699958',
    model: 'deepseek-chat',
    baseURL: 'https://api.deepseek.com/v1',
    maxTokens: 500,
    temperature: 0.3,
    timeout: 30000 // 30秒超时
};

// 分析缓存（避免重复分析相同用户）
const analysisCache = new Map();
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24小时缓存

// 主分析函数
async function analyzeFollowers() {
    console.log('开始AI分析关注者...');
    
    try {
        const followers = extractFollowersFromPage();
        console.log(`找到 ${followers.length} 个关注者`);
        
        if (followers.length === 0) {
            return { success: false, error: '未找到关注者列表' };
        }
        
        const results = [];
        let processed = 0;
        
        // 批量分析（每5个更新一次进度）
        const batchSize = 5;
        for (let i = 0; i < followers.length; i += batchSize) {
            const batch = followers.slice(i, i + batchSize);
            const batchResults = await analyzeBatchWithAI(batch);
            results.push(...batchResults);
            
            processed += batch.length;
            const progress = Math.round((processed / followers.length) * 100);
            
            // 发送进度更新到popup
            chrome.runtime.sendMessage({
                action: 'updateProgress',
                progress: progress,
                processed: processed,
                total: followers.length
            });
            
            // 避免过快请求（API限流）
            await delay(500);
        }
        
        console.log('AI分析完成:', results);
        return { success: true, results: results };
        
    } catch (error) {
        console.error('分析错误:', error);
        return { success: false, error: error.message };
    }
}

// 从页面提取关注者（保持不变）
function extractFollowersFromPage() {
    const followers = [];
    
    // 尝试不同的选择器（X平台可能更新）
    const selectors = [
        'div[data-testid="UserCell"]',
        'div[data-testid="User-Name"]',
        'a[href*="/following"] ~ div div[dir="auto"] span',
        'article[data-testid="UserCell"]'
    ];
    
    for (const selector of selectors) {
        const elements = document.querySelectorAll(selector);
        if (elements.length > 0) {
            console.log(`使用选择器 "${selector}" 找到 ${elements.length} 个元素`);
            
            elements.forEach(element => {
                const userInfo = extractUserInfo(element);
                if (userInfo.username) {
                    followers.push(userInfo);
                }
            });
            
            if (followers.length > 0) break;
        }
    }
    
    // 如果没找到，尝试通用方法
    if (followers.length === 0) {
        console.log('使用通用方法提取关注者');
        extractFollowersGeneric(followers);
    }
    
    return followers;
}

// 提取用户信息（保持不变）
function extractUserInfo(element) {
    try {
        // 获取用户名（@username）
        let username = '';
        const usernameElements = element.querySelectorAll('a[href*="/"] span');
        for (const el of usernameElements) {
            const text = el.textContent.trim();
            if (text.startsWith('@')) {
                username = text.substring(1);
                break;
            }
        }
        
        // 获取显示名称
        let displayName = '';
        const nameElements = element.querySelectorAll('div[dir="auto"] span');
        for (const el of nameElements) {
            const text = el.textContent.trim();
            if (text && !text.startsWith('@') && text.length > 1) {
                displayName = text;
                break;
            }
        }
        
        // 获取描述
        let description = '';
        const descElement = element.querySelector('div[data-testid="UserDescription"]');
        if (descElement) {
            description = descElement.textContent.trim();
        }
        
        return {
            username: username,
            displayName: displayName,
            description: description,
            element: element
        };
    } catch (error) {
        console.error('提取用户信息错误:', error);
        return { username: '', displayName: '', description: '' };
    }
}

// 通用提取方法（保持不变）
function extractFollowersGeneric(followers) {
    // 查找所有包含用户信息的元素
    const allSpans = document.querySelectorAll('span');
    let currentUser = null;
    
    allSpans.forEach(span => {
        const text = span.textContent.trim();
        
        if (text && text.length > 1 && !text.startsWith('@')) {
            // 可能是显示名称
            if (!currentUser) {
                currentUser = { displayName: text };
            } else if (!currentUser.displayName) {
                currentUser.displayName = text;
            }
        } else if (text.startsWith('@')) {
            // 用户名
            const username = text.substring(1);
            if (currentUser) {
                currentUser.username = username;
                followers.push(currentUser);
                currentUser = null;
            } else {
                followers.push({ username: username, displayName: '' });
            }
        }
    });
}

// 批量AI分析
async function analyzeBatchWithAI(users) {
    const results = [];
    
    for (const user of users) {
        const result = await analyzeUserWithAI(user);
        results.push(result);
    }
    
    return results;
}

// 使用DeepSeek AI分析单个用户
async function analyzeUserWithAI(user) {
    console.log(`AI分析用户: @${user.username}`);
    
    // 检查缓存
    const cacheKey = `ai_${user.username}_${user.description}`;
    const cachedResult = getCachedAnalysis(cacheKey);
    if (cachedResult) {
        console.log(`使用缓存结果: @${user.username}`);
        return {
            ...cachedResult,
            username: user.username,
            displayName: user.displayName,
            element: user.element
        };
    }
    
    try {
        // 调用DeepSeek API
        const aiResult = await callDeepSeekAPI(user);
        
        // 缓存结果
        cacheAnalysis(cacheKey, aiResult);
        
        return {
            username: user.username,
            displayName: user.displayName,
            confidence: aiResult.confidence,
            isCrypto: aiResult.is_crypto,
            reasons: aiResult.reasons,
            analysis: aiResult.analysis,
            source: 'deepseek',
            element: user.element
        };
        
    } catch (error) {
        console.error(`AI分析失败 @${user.username}:`, error);
        
        // AI分析失败时的降级处理
        return {
            username: user.username,
            displayName: user.displayName,
            confidence: 50, // 不确定
            isCrypto: false,
            reasons: ['AI分析失败，请手动判断'],
            analysis: 'AI服务暂时不可用',
            source: 'fallback',
            element: user.element
        };
    }
}

// 构建DeepSeek提示词
function buildDeepSeekPrompt(user) {
    return `你是一个专业的加密货币领域分析师。请分析以下X（原Twitter）博主是否为加密货币/区块链领域的博主。

博主信息：
- 用户名：@${user.username}
- 显示名称：${user.displayName || '无'}
- 个人简介：${user.description || '无'}

分析要求：
1. 判断是否为加密货币领域博主（是/否）
2. 给出置信度（0-100%，基于简介内容的明确程度）
3. 列出主要判断依据（1-3条关键证据）
4. 如果简介中包含以下内容，请特别关注：比特币、以太坊、ETH、BTC、区块链、加密货币、Crypto、NFT、DeFi、Web3、挖矿、交易所、数字货币、代币

重要：如果简介为空或内容不明确，请给出较低置信度（<50%）。

请用以下JSON格式回复，不要添加其他内容：
{
  "is_crypto": true/false,
  "confidence": 0-100,
  "reasons": ["原因1", "原因2"],
  "analysis": "简要分析说明"
}`;
}

// 调用DeepSeek API
async function callDeepSeekAPI(user) {
    const prompt = buildDeepSeekPrompt(user);
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), DEEPSEEK_CONFIG.timeout);
    
    try {
        const response = await fetch(`${DEEPSEEK_CONFIG.baseURL}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${DEEPSEEK_CONFIG.apiKey}`
            },
            body: JSON.stringify({
                model: DEEPSEEK_CONFIG.model,
                messages: [
                    { 
                        role: 'system', 
                        content: '你是一个专业的加密货币分析师。请严格按照要求的JSON格式回复，不要添加任何额外文本。' 
                    },
                    { role: 'user', content: prompt }
                ],
                max_tokens: DEEPSEEK_CONFIG.maxTokens,
                temperature: DEEPSEEK_CONFIG.temperature,
                response_format: { type: 'json_object' }
            }),
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
            throw new Error(`DeepSeek API错误: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        const content = data.choices[0].message.content;
        
        // 解析JSON响应
        const result = JSON.parse(content);
        
        // 验证结果格式
        if (typeof result.is_crypto !== 'boolean' || 
            typeof result.confidence !== 'number' ||
            !Array.isArray(result.reasons)) {
            throw new Error('DeepSeek返回格式不正确');
        }
        
        // 确保置信度在0-100范围内
        result.confidence = Math.max(0, Math.min(100, result.confidence));
        
        return result;
        
    } catch (error) {
        clearTimeout(timeoutId);
        throw error;
    }
}

// 缓存管理
function getCachedAnalysis(key) {
    const cached = analysisCache.get(key);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        return cached.result;
    }
    return null;
}

function cacheAnalysis(key, result) {
    analysisCache.set(key, {
        result: result,
        timestamp: Date.now()
    });
    
    // 限制缓存大小
    if (analysisCache.size > 100) {
        const oldestKey = Array.from(analysisCache.keys())[0];
        analysisCache.delete(oldestKey);
    }
}

// 工具函数
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// 监听来自popup的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('收到消息:', request);
    
    if (request.action === 'analyze') {
        // 异步处理分析请求
        analyzeFollowers().then(result => {
            sendResponse(result);
        }).catch(error => {
            sendResponse({ success: false, error: error.message });
        });
        
        return true; // 保持消息通道开放
    }
    
    if (request.action === 'unfollow') {
        // 执行取关操作
        const success = unfollowUser(request.username);
        sendResponse({ success: success });
    }
});

// 取关用户（示例实现）
function unfollowUser(username) {
    console.log(`执行取关: @${username}`);
    // 这里需要实现实际的取关逻辑
    // 注意：X平台的取关操作需要模拟用户点击
    return true;
}

// 页面加载完成后初始化
console.log('X Smart Unfollow AI版已就绪');