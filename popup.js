// X Smart Unfollow - 弹出窗口（AI分析版本）
document.addEventListener('DOMContentLoaded', function() {
    // 获取DOM元素
    const analyzeBtn = document.getElementById('analyzeBtn');
    const unfollowBtn = document.getElementById('unfollowBtn');
    const settingsBtn = document.getElementById('settingsBtn');
    const resultsDiv = document.getElementById('results');
    const progressDiv = document.getElementById('progress');
    const progressBar = document.getElementById('progressBar');
    const progressText = document.getElementById('progressText');
    const statusDiv = document.getElementById('status');
    
    // 分析结果存储
    let analysisResults = [];
    let selectedUsers = new Set();
    
    // 初始化
    updateUI();
    
    // 分析按钮点击事件
    analyzeBtn.addEventListener('click', async function() {
        console.log('开始分析...');
        
        // 重置状态
        analysisResults = [];
        selectedUsers.clear();
        resultsDiv.innerHTML = '';
        statusDiv.textContent = '正在分析中...';
        progressDiv.style.display = 'block';
        analyzeBtn.disabled = true;
        unfollowBtn.disabled = true;
        
        try {
            // 获取当前活跃的X标签页
            const [tab] = await chrome.tabs.query({ 
                active: true, 
                currentWindow: true,
                url: ['*://*.x.com/*', '*://*.twitter.com/*']
            });
            
            if (!tab) {
                statusDiv.textContent = '错误：请在X关注页面使用此插件';
                analyzeBtn.disabled = false;
                return;
            }
            
            // 发送分析请求到内容脚本
            const response = await chrome.tabs.sendMessage(tab.id, { action: 'analyze' });
            
            if (response.success) {
                analysisResults = response.results;
                statusDiv.textContent = `分析完成：找到 ${analysisResults.length} 个关注者`;
                displayResults(analysisResults);
            } else {
                statusDiv.textContent = `分析失败：${response.error}`;
            }
            
        } catch (error) {
            console.error('分析错误:', error);
            statusDiv.textContent = `错误：${error.message}`;
            
            // 检查是否内容脚本未加载
            if (error.message.includes('Receiving end does not exist')) {
                statusDiv.textContent = '错误：请刷新X页面后重试';
            }
        } finally {
            progressDiv.style.display = 'none';
            analyzeBtn.disabled = false;
            updateUnfollowButton();
        }
    });
    
    // 取关按钮点击事件
    unfollowBtn.addEventListener('click', async function() {
        if (selectedUsers.size === 0) {
            statusDiv.textContent = '请先选择要取关的博主';
            return;
        }
        
        if (!confirm(`确定要取关选中的 ${selectedUsers.size} 个博主吗？`)) {
            return;
        }
        
        statusDiv.textContent = '正在执行取关操作...';
        unfollowBtn.disabled = true;
        
        try {
            // 获取当前标签页
            const [tab] = await chrome.tabs.query({ 
                active: true, 
                currentWindow: true 
            });
            
            // 发送取关请求
            let successCount = 0;
            for (const username of selectedUsers) {
                const response = await chrome.tabs.sendMessage(tab.id, { 
                    action: 'unfollow', 
                    username: username 
                });
                
                if (response.success) {
                    successCount++;
                }
                
                // 避免过快操作
                await delay(1000);
            }
            
            statusDiv.textContent = `取关完成：成功 ${successCount}/${selectedUsers.size}`;
            selectedUsers.clear();
            updateUnfollowButton();
            
            // 重新分析
            analyzeBtn.click();
            
        } catch (error) {
            console.error('取关错误:', error);
            statusDiv.textContent = `取关失败：${error.message}`;
        } finally {
            unfollowBtn.disabled = false;
        }
    });
    
    // 设置按钮点击事件
    settingsBtn.addEventListener('click', function() {
        // 显示设置界面
        alert('设置功能开发中...\n当前使用DeepSeek AI分析。');
    });
    
    // 显示分析结果
    function displayResults(results) {
        resultsDiv.innerHTML = '';
        
        if (!results || results.length === 0) {
            resultsDiv.innerHTML = '<div class="no-results">未找到分析结果</div>';
            return;
        }
        
        // 按置信度排序
        results.sort((a, b) => b.confidence - a.confidence);
        
        // 显示每个结果
        results.forEach((result, index) => {
            const resultElement = createResultElement(result, index);
            resultsDiv.appendChild(resultElement);
        });
    }
    
    // 创建单个结果元素
    function createResultElement(result, index) {
        const div = document.createElement('div');
        div.className = 'result-item';
        
        // 根据置信度设置样式
        if (result.confidence >= 70) {
            div.classList.add('crypto-high');
        } else if (result.confidence >= 40) {
            div.classList.add('crypto-medium');
        } else {
            div.classList.add('crypto-low');
        }
        
        // 是否被选中
        if (selectedUsers.has(result.username)) {
            div.classList.add('selected');
        }
        
        // 构建HTML内容
        const confidenceColor = getConfidenceColor(result.confidence);
        const cryptoText = result.isCrypto ? '是' : '否';
        
        // 根据分析来源显示不同的图标
        let sourceText = '';
        if (result.source === 'deepseek') {
            sourceText = '🤖 AI分析';
        } else if (result.source === 'username_analysis') {
            sourceText = '👤 用户名分析';
        } else if (result.source === 'displayname_analysis') {
            sourceText = '📝 显示名称分析';
        } else {
            sourceText = '⚠️ 降级分析';
        }
        
        div.innerHTML = `
            <div class="result-header">
                <input type="checkbox" class="user-checkbox" 
                       data-username="${result.username}"
                       ${result.isCrypto ? 'checked' : ''}>
                <span class="username">@${result.username}</span>
                <span class="confidence" style="color: ${confidenceColor}">
                    ${result.confidence}%
                </span>
            </div>
            <div class="result-body">
                <div class="display-name">${result.displayName || '无显示名称'}</div>
                <div class="description">${result.description || '无简介'}</div>
                <div class="analysis-info">
                    <span class="crypto-status">Crypto博主: ${cryptoText}</span>
                    <span class="source">${sourceText}</span>
                </div>
                ${result.reasons && result.reasons.length > 0 ? `
                <div class="reasons">
                    <strong>判断依据:</strong>
                    <ul>
                        ${result.reasons.map(reason => `<li>${reason}</li>`).join('')}
                    </ul>
                </div>
                ` : ''}
                ${result.analysis ? `
                <div class="analysis">
                    <strong>分析说明:</strong> ${result.analysis}
                </div>
                ` : ''}
            </div>
        `;
        
        // 添加点击事件
        div.addEventListener('click', function(e) {
            if (e.target.type === 'checkbox') return;
            
            const checkbox = div.querySelector('.user-checkbox');
            checkbox.checked = !checkbox.checked;
            toggleUserSelection(result.username, checkbox.checked);
        });
        
        // 复选框事件
        const checkbox = div.querySelector('.user-checkbox');
        checkbox.addEventListener('change', function(e) {
            e.stopPropagation();
            toggleUserSelection(result.username, this.checked);
        });
        
        return div;
    }
    
    // 切换用户选择
    function toggleUserSelection(username, isSelected) {
        if (isSelected) {
            selectedUsers.add(username);
        } else {
            selectedUsers.delete(username);
        }
        
        // 更新UI
        updateUnfollowButton();
        
        // 更新结果项样式
        const items = document.querySelectorAll('.result-item');
        items.forEach(item => {
            const itemUsername = item.querySelector('.username').textContent.substring(1);
            if (itemUsername === username) {
                item.classList.toggle('selected', isSelected);
            }
        });
    }
    
    // 更新取关按钮状态
    function updateUnfollowButton() {
        const count = selectedUsers.size;
        unfollowBtn.disabled = count === 0;
        unfollowBtn.textContent = count > 0 ? 
            `批量取关 (${count}个)` : '批量取关';
    }
    
    // 更新UI状态
    function updateUI() {
        unfollowBtn.disabled = selectedUsers.size === 0;
    }
    
    // 监听进度更新
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action === 'updateProgress') {
            const progress = request.progress;
            progressBar.style.width = `${progress}%`;
            progressText.textContent = `分析中... ${progress}% (${request.processed}/${request.total})`;
        }
    });
    
    // 工具函数
    function getConfidenceColor(confidence) {
        if (confidence >= 70) return '#e74c3c'; // 红色：高置信度Crypto
        if (confidence >= 40) return '#f39c12'; // 橙色：中等置信度
        return '#2ecc71'; // 绿色：低置信度/非Crypto
    }
    
    function delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    // 初始化状态
    console.log('X Smart Unfollow AI版弹出窗口已加载');
});