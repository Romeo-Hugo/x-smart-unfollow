// X Smart Unfollow - 弹出窗口逻辑
document.addEventListener('DOMContentLoaded', function() {
    const analyzeBtn = document.getElementById('analyzeBtn');
    const unfollowBtn = document.getElementById('unfollowBtn');
    const progressContainer = document.getElementById('progressContainer');
    const progressBar = document.getElementById('progressBar');
    const resultsSection = document.getElementById('resultsSection');
    const resultsList = document.getElementById('resultsList');
    const totalCount = document.getElementById('totalCount');
    const suggestedCount = document.getElementById('suggestedCount');
    const selectedCount = document.getElementById('selectedCount');

    let analysisResults = [];
    let selectedUsernames = new Set();

    // 分析按钮点击事件
    analyzeBtn.addEventListener('click', async function() {
        analyzeBtn.disabled = true;
        analyzeBtn.textContent = '分析中...';
        progressContainer.style.display = 'block';
        
        try {
            // 获取当前标签页
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            
            // 发送消息给content script开始分析
            const response = await chrome.tabs.sendMessage(tab.id, { 
                action: 'analyzeFollowers' 
            });
            
            if (response && response.success) {
                analysisResults = response.results;
                displayResults(analysisResults);
                resultsSection.style.display = 'block';
                
                // 滚动到结果区域
                resultsSection.scrollIntoView({ behavior: 'smooth' });
            } else {
                showError('分析失败，请确保在X关注页面');
            }
        } catch (error) {
            console.error('分析错误:', error);
            showError('分析失败: ' + error.message);
        } finally {
            analyzeBtn.disabled = false;
            analyzeBtn.textContent = '🚀 开始分析关注列表';
            progressContainer.style.display = 'none';
        }
    });

    // 批量取关按钮点击事件
    unfollowBtn.addEventListener('click', async function() {
        if (selectedUsernames.size === 0) {
            showError('请先选择要取关的博主');
            return;
        }

        if (!confirm(`确定要取关选中的 ${selectedUsernames.size} 个博主吗？此操作不可撤销。`)) {
            return;
        }

        unfollowBtn.disabled = true;
        unfollowBtn.textContent = '取关中...';

        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            
            const response = await chrome.tabs.sendMessage(tab.id, { 
                action: 'unfollowSelected',
                usernames: Array.from(selectedUsernames)
            });
            
            if (response && response.success) {
                alert(`成功取关 ${response.unfollowedCount} 个博主`);
                
                // 更新结果列表
                analysisResults = analysisResults.filter(result => 
                    !selectedUsernames.has(result.username)
                );
                displayResults(analysisResults);
                selectedUsernames.clear();
                updateSelectedCount();
            } else {
                showError('取关失败: ' + (response?.error || '未知错误'));
            }
        } catch (error) {
            console.error('取关错误:', error);
            showError('取关失败: ' + error.message);
        } finally {
            unfollowBtn.disabled = selectedUsernames.size === 0;
            unfollowBtn.textContent = `⚡ 批量取关选中博主 (${selectedUsernames.size})`;
        }
    });

    // 显示分析结果
    function displayResults(results) {
        resultsList.innerHTML = '';
        totalCount.textContent = results.length;
        
        const suggested = results.filter(r => r.confidence >= 70).length;
        suggestedCount.textContent = suggested;
        
        results.forEach((result, index) => {
            const item = createResultItem(result, index);
            resultsList.appendChild(item);
        });
        
        updateSelectedCount();
    }

    // 创建结果项
    function createResultItem(result, index) {
        const div = document.createElement('div');
        div.className = 'result-item';
        
        const confidenceClass = result.confidence >= 80 ? 'high' : 
                              result.confidence >= 60 ? 'medium' : 'low';
        
        div.innerHTML = `
            <input type="checkbox" class="checkbox" id="check-${index}" 
                   ${result.confidence >= 70 ? 'checked' : ''}>
            <div class="username">${result.displayName || result.username}</div>
            <div class="confidence ${confidenceClass}">${result.confidence}%</div>
        `;
        
        const checkbox = div.querySelector('.checkbox');
        checkbox.addEventListener('change', function() {
            if (this.checked) {
                selectedUsernames.add(result.username);
            } else {
                selectedUsernames.delete(result.username);
            }
            updateSelectedCount();
        });
        
        // 默认选中高置信度的
        if (result.confidence >= 70) {
            selectedUsernames.add(result.username);
        }
        
        return div;
    }

    // 更新选中计数
    function updateSelectedCount() {
        selectedCount.textContent = selectedUsernames.size;
        unfollowBtn.disabled = selectedUsernames.size === 0;
        unfollowBtn.textContent = `⚡ 批量取关选中博主 (${selectedUsernames.size})`;
    }

    // 显示错误
    function showError(message) {
        const status = document.querySelector('.status');
        status.innerHTML = `
            <div class="status-title" style="color: #c62828;">❌ 错误</div>
            <div class="status-desc">${message}</div>
        `;
        status.style.background = '#ffebee';
    }

    // 更新进度条
    function updateProgress(percent) {
        progressBar.style.width = percent + '%';
    }

    // 模拟进度更新（实际由content script控制）
    window.updateProgress = updateProgress;
});