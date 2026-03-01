// X Smart Unfollow - 内容脚本（注入到X页面）
console.log('X Smart Unfollow 内容脚本已加载');

// Crypto关键词列表
const CRYPTO_KEYWORDS = [
    // 英文关键词
    'bitcoin', 'btc', 'ethereum', 'eth', 'crypto', 'cryptocurrency',
    'blockchain', 'defi', 'nft', 'web3', 'altcoin', 'mining',
    'wallet', 'exchange', 'token', 'ico', 'airdrop', 'staking',
    // 中文关键词
    '比特币', '以太坊', '加密货币', '数字货币', '区块链',
    '去中心化', '挖矿', '交易所', '代币', '空投', '质押'
];

// 分析关注者
async function analyzeFollowers() {
    console.log('开始分析关注者...');
    
    try {
        const followers = extractFollowersFromPage();
        console.log(`找到 ${followers.length} 个关注者`);
        
        if (followers.length === 0) {
            return { success: false, error: '未找到关注者列表' };
        }
        
        const results = [];
        let processed = 0;
        
        // 批量分析（每10个更新一次进度）
        const batchSize = 10;
        for (let i = 0; i < followers.length; i += batchSize) {
            const batch = followers.slice(i, i + batchSize);
            const batchResults = await analyzeBatch(batch);
            results.push(...batchResults);
            
            processed += batch.length;
            const progress = Math.round((processed / followers.length) * 100);
            
            // 发送进度更新到popup
            chrome.runtime.sendMessage({
                action: 'updateProgress',
                progress: progress
            });
            
            // 避免过快请求
            await delay(100);
        }
        
        console.log('分析完成:', results);
        return { success: true, results: results };
        
    } catch (error) {
        console.error('分析错误:', error);
        return { success: false, error: error.message };
    }
}

// 从页面提取关注者
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

// 提取用户信息
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

// 通用提取方法
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

// 批量分析用户
async function analyzeBatch(users) {
    const results = [];
    
    for (const user of users) {
        const result = await analyzeUser(user);
        results.push(result);
    }
    
    return results;
}

// 分析单个用户
async function analyzeUser(user) {
    console.log(`分析用户: ${user.username}`);
    
    // 本地关键词分析
    const localScore = analyzeLocally(user);
    
    // 如果需要，调用云端API增强分析
    let finalScore = localScore;
    let needsCloudAnalysis = localScore < 70 && localScore > 30;
    
    if (needsCloudAnalysis) {
        try {
            const cloudScore = await analyzeWithCloud(user);
            if (cloudScore !== null) {
                // 结合本地和云端分数
                finalScore = Math.round((localScore * 0.4) + (cloudScore * 0.6));
            }
        } catch (error) {
            console.warn('云端分析失败，使用本地分数:', error);
        }
    }
    
    return {
        username: user.username,
        displayName: user.displayName,
        confidence: finalScore,
        description: user.description || '',
        element: user.element
    };
}

// 本地关键词分析
function analyzeLocally(user) {
    let score = 0;
    const textToAnalyze = (user.description || '').toLowerCase() + ' ' + 
                         (user.displayName || '').toLowerCase();
    
    // 检查关键词
    let keywordMatches = 0;
    CRYPTO_KEYWORDS.forEach(keyword => {
        if (textToAnalyze.includes(keyword.toLowerCase())) {
            keywordMatches++;
        }
    });
    
    // 基础分数：关键词匹配
    if (keywordMatches > 0) {
        score = Math.min(30 + (keywordMatches * 10), 80);
    }
    
    // 检查用户名中的关键词
    const username = (user.username || '').toLowerCase();
    if (username.includes('crypto') || username.includes('btc') || 
        username.includes('eth') || username.includes('coin')) {
        score = Math.max(score, 70);
    }
    
    // 检查显示名称
    const displayName = (user.displayName || '').toLowerCase();
    if (displayName.includes('crypto') || displayName.includes('blockchain') ||
        displayName.includes('比特币') || displayName.includes('以太坊')) {
        score = Math.max(score, 75);
    }
    
    return Math.min(score, 100);
}

// 云端分析（模拟）
async function analyzeWithCloud(user) {
    console.log(`调用云端分析: ${user.username}`);
    
    // 这里应该调用真实的API
    // 暂时返回模拟数据
    return new Promise(resolve => {
        setTimeout(() => {
            // 模拟API响应
            const randomScore = Math.floor(Math.random() * 30) + 60;
            resolve(randomScore);
        }, 300);
    });
}

// 取关选中的用户
async function unfollowSelected(usernames) {
    console.log(`开始取关 ${usernames.length} 个用户`);
    
    try {
        let unfollowedCount = 0;
        
        for (const username of usernames) {
            const success = await unfollowUser(username);
            if (success) {
                unfollowedCount++;
                await delay(1000); // 避免过快操作
            }
        }
        
        return { success: true, unfollowedCount: unfollowedCount };
        
    } catch (error) {
        console.error('取关错误:', error);
        return { success: false, error: error.message };
    }
}

// 取关单个用户
async function unfollowUser(username) {
    console.log(`取关用户: ${username}`);
    
    try {
        // 查找用户的"正在关注"按钮
        const buttons = document.querySelectorAll('div[role="button"]');
        let unfollowButton = null;
        
        for (const button of buttons) {
            const text = button.textContent.trim().toLowerCase();
            if (text.includes('following') || text.includes('正在关注')) {
                // 检查是否是对应用户的按钮
                const userCell = button.closest('div[data-testid="UserCell"]');
                if (userCell) {
                    const userText = userCell.textContent.toLowerCase();
                    if (userText.includes(username.toLowerCase())) {
                        unfollowButton = button;
                        break;
                    }
                }
            }
        }
        
        if (unfollowButton) {
            // 点击"正在关注"按钮
            unfollowButton.click();
            await delay(300);
            
            // 查找并点击确认按钮
            const confirmButtons = document.querySelectorAll('div[role="menuitem"]');
            for (const btn of confirmButtons) {
                const text = btn.textContent.trim().toLowerCase();
                if (text.includes('unfollow') || text.includes('取消关注')) {
                    btn.click();
                    await delay(500);
                    return true;
                }
            }
        }
        
        return false;
        
    } catch (error) {
        console.error(`取关用户 ${username} 错误:`, error);
        return false;
    }
}

// 工具函数
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// 监听来自popup的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('收到消息:', request);
    
    if (request.action === 'analyzeFollowers') {
        analyzeFollowers().then(sendResponse);
        return true; // 保持消息通道开放
    }
    
    if (request.action === 'unfollowSelected') {
        unfollowSelected(request.usernames || []).then(sendResponse);
        return true;
    }
    
    if (request.action === 'updateProgress') {
        // 转发进度更新到popup
        chrome.runtime.sendMessage({
            action: 'progressUpdate',
            progress: request.progress
        });
    }
});

// 页面加载完成后初始化
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

function init() {
    console.log('X Smart Unfollow 初始化完成');
    // 可以在这里添加页面标记等功能
}