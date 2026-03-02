// 测试 lanhubiji 用户分析
console.log('测试 lanhubiji 用户分析...\n');

// 模拟用户数据
const testUser = {
    username: 'lanhubiji',
    displayName: 'lanhubiji',
    description: ''
};

// 测试用户名分析函数
function analyzeUsernameForCrypto(username) {
    const usernameLower = username.toLowerCase();
    
    // Crypto相关用户名关键词
    const cryptoUsernamePatterns = [
        // 英文关键词
        { pattern: /crypto/, score: 90, reason: '用户名包含"crypto"' },
        { pattern: /btc/, score: 95, reason: '用户名包含"btc"（比特币）' },
        { pattern: /eth/, score: 95, reason: '用户名包含"eth"（以太坊）' },
        { pattern: /coin/, score: 85, reason: '用户名包含"coin"（币）' },
        { pattern: /token/, score: 85, reason: '用户名包含"token"（代币）' },
        { pattern: /wallet/, score: 80, reason: '用户名包含"wallet"（钱包）' },
        { pattern: /mining/, score: 80, reason: '用户名包含"mining"（挖矿）' },
        { pattern: /exchange/, score: 80, reason: '用户名包含"exchange"（交易所）' },
        { pattern: /defi/, score: 85, reason: '用户名包含"defi"' },
        { pattern: /nft/, score: 85, reason: '用户名包含"nft"' },
        { pattern: /web3/, score: 85, reason: '用户名包含"web3"' },
        // 中文关键词
        { pattern: /币/, score: 90, reason: '用户名包含"币"字' },
        { pattern: /链/, score: 80, reason: '用户名包含"链"字' },
        { pattern: /挖/, score: 80, reason: '用户名包含"挖"字' },
        { pattern: /矿/, score: 80, reason: '用户名包含"矿"字' },
        // 常见Crypto博主用户名模式
        { pattern: /lanhu/, score: 70, reason: '用户名包含"lanhu"（可能是蓝狐相关）' },
        { pattern: /hubiji/, score: 75, reason: '用户名包含"hubiji"（可能是币记相关）' }
    ];
    
    // 检查所有模式
    for (const { pattern, score, reason } of cryptoUsernamePatterns) {
        if (pattern.test(usernameLower)) {
            return {
                isLikelyCrypto: true,
                confidence: score,
                reasons: [reason]
            };
        }
    }
    
    return {
        isLikelyCrypto: false,
        confidence: 0,
        reasons: []
    };
}

// 测试
console.log('用户数据:', testUser);
console.log('\n用户名分析结果:');
const usernameResult = analyzeUsernameForCrypto(testUser.username);
console.log(JSON.stringify(usernameResult, null, 2));

// 构建提示词（新版本）
function buildDeepSeekPrompt(user) {
    return `你是一个专业的加密货币领域分析师。请分析以下X（原Twitter）博主是否为加密货币/区块链领域的博主。

博主信息：
- 用户名：@${user.username}（请分析用户名是否包含Crypto相关含义）
- 显示名称：${user.displayName || '无'}
- 个人简介：${user.description || '无'}

分析要求：
1. 判断是否为加密货币领域博主（是/否）
2. 给出置信度（0-100%，综合考虑用户名、显示名称和简介）
3. 列出主要判断依据（1-3条关键证据）
4. 特别关注以下信号：
   - 用户名中包含：crypto、btc、eth、coin、token、wallet、mining、exchange等
   - 显示名称中包含加密货币相关词汇
   - 简介中提到：比特币、以太坊、ETH、BTC、区块链、加密货币、Crypto、NFT、DeFi、Web3、挖矿、交易所、数字货币、代币

重要分析原则：
1. 如果用户名明显包含Crypto相关词汇（如包含btc、eth、crypto等），即使简介为空，也应给出较高置信度
2. 如果所有信息都不明确，请给出较低置信度（<50%）
3. 考虑用户名可能是Crypto相关的缩写或变体（如lanhubiji可能是蓝狐币记）

请用以下JSON格式回复，不要添加任何其他内容：
{
  "is_crypto": true/false,
  "confidence": 0-100,
  "reasons": ["原因1", "原因2"],
  "analysis": "简要分析说明"
}`;
}

console.log('\n新提示词示例:');
console.log(buildDeepSeekPrompt(testUser));

// 测试其他常见Crypto用户名
const testUsernames = [
    'lanhubiji',
    'btcwhale',
    'ethmaxi',
    'cryptoking',
    'defiguru',
    'nftcollector',
    'web3builder',
    '比特币大王',
    '以太坊信徒',
    '区块链技术',
    'justinbieber', // 非Crypto
    'techreview'    // 非Crypto
];

console.log('\n测试多个用户名分析:');
testUsernames.forEach(username => {
    const result = analyzeUsernameForCrypto(username);
    console.log(`${username}: ${result.isLikelyCrypto ? '✅' : '❌'} ${result.confidence}% - ${result.reasons[0] || '非Crypto'}`);
});