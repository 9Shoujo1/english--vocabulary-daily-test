class UIManager {
    constructor() {
        this.currentView = 'view-wordbank-selector';
        this.cachedElements = {}; // 缓存DOM元素引用
    }

    // 获取并缓存DOM元素
    getElement(id) {
        if (!this.cachedElements[id]) {
            this.cachedElements[id] = document.getElementById(id);
        }
        return this.cachedElements[id];
    }

    showView(viewId) {
        // 使用requestAnimationFrame优化视图切换
        requestAnimationFrame(() => {
            // 隐藏所有视图
            const views = document.querySelectorAll('.view');
            views.forEach(view => {
                view.classList.remove('active');
            });

            // 显示目标视图
            const targetView = this.getElement(viewId);
            if (targetView) {
                targetView.classList.add('active');
                this.currentView = viewId;
                
                // 触发视图变更事件
                this.onViewChange(viewId);
            }
        });
    }

    // 视图变更时的回调
    onViewChange(viewId) {
        // 可以在这里添加视图变更时的额外逻辑
        console.log('View changed to:', viewId);
    }

    updateProgress(current, total) {
        const progressFill = this.getElement('progress-fill');
        const progressText = this.getElement('progress-text');
        
        if (progressFill && progressText) {
            const percentage = Math.round((current / total) * 100);
            // 使用transform代替width以提高性能
            progressFill.style.transform = `scaleX(${percentage / 100})`;
            progressText.textContent = `${current}/${total}`;
        }
    }

    renderQuizWord(word, options) {
        const wordElement = this.getElement('current-word');
        const phoneticElement = this.getElement('current-phonetic');
        const partOfSpeechElement = this.getElement('current-part-of-speech');
        const optionsContainer = this.getElement('options-container');
        const feedbackElement = this.getElement('feedback-message');

        if (!wordElement || !optionsContainer) {
            console.error('找不到单词显示元素');
            return;
        }

        // 使用textContent更新文本内容，避免XSS攻击
        wordElement.textContent = word.word || '';

        // 显示音标（如果有）
        if (phoneticElement) {
            phoneticElement.textContent = word.phonetic || '';
        }

        // 显示词性（如果有）
        if (partOfSpeechElement) {
            partOfSpeechElement.textContent = word.partOfSpeech || '';
        }

        // 清空选项和反馈
        optionsContainer.innerHTML = '';
        if (feedbackElement) {
            feedbackElement.textContent = '';
            feedbackElement.className = 'feedback-message';
        }

        // 使用DocumentFragment优化DOM操作，减少重绘
        const fragment = document.createDocumentFragment();
        
        // 渲染选项
        options.forEach((option, index) => {
            const button = document.createElement('button');
            button.className = 'option-btn';
            button.textContent = option.translation || '';
            button.dataset.translation = option.translation || '';
            button.dataset.index = index;
            button.setAttribute('aria-label', `选项 ${index + 1}: ${option.translation}`);
            fragment.appendChild(button);
        });
        
        optionsContainer.appendChild(fragment);
    }

    showFeedback(isCorrect, correctTranslation) {
        const feedbackElement = document.getElementById('feedback-message');
        if (!feedbackElement) return;

        if (isCorrect) {
            feedbackElement.textContent = '✓ 正确！';
            feedbackElement.className = 'feedback-message correct';
        } else {
            feedbackElement.textContent = `✗ 错误！正确答案是：${correctTranslation}`;
            feedbackElement.className = 'feedback-message wrong';
        }
    }

    highlightOption(buttonElement, isCorrect) {
        if (isCorrect) {
            buttonElement.classList.add('correct');
        } else {
            buttonElement.classList.add('wrong');
        }
        buttonElement.disabled = true;
    }

    disableAllOptions() {
        const options = document.querySelectorAll('.option-btn');
        options.forEach(option => {
            option.disabled = true;
        });
    }

    renderWordBankSelector() {
        // 单词库选择页已经在HTML中静态定义，这里只需要确保视图正确显示
        this.showView('view-wordbank-selector');
    }

    renderMasteredList(words) {
        const listElement = this.getElement('mastered-list');
        const countElement = this.getElement('mastered-count');
        
        if (!listElement) {
            console.error('找不到已掌握列表元素');
            return;
        }

        // 更新计数
        if (countElement) {
            countElement.textContent = words.length;
        }

        // 清空列表
        listElement.innerHTML = '';

        // 使用DocumentFragment优化DOM操作
        const fragment = document.createDocumentFragment();

        // 渲染单词列表
        if (words.length === 0) {
            const emptyMessage = document.createElement('div');
            emptyMessage.style.textAlign = 'center';
            emptyMessage.style.padding = '40px';
            emptyMessage.style.color = '#999';
            emptyMessage.textContent = '还没有掌握任何单词';
            fragment.appendChild(emptyMessage);
        } else {
            words.forEach(word => {
                const item = document.createElement('div');
                item.className = 'word-item';
                
                const progress = word.progress || {};
                const wrongCount = progress.wrongCount || 0;
                const masteredDate = progress.masteredDate || '';

                // 使用安全的DOM操作，避免innerHTML XSS风险
                const wordInfo = document.createElement('div');
                
                const wordDiv = document.createElement('div');
                wordDiv.className = 'word';
                wordDiv.textContent = word.word || '';
                
                const translationDiv = document.createElement('div');
                translationDiv.className = 'translation';
                translationDiv.textContent = word.translation || '';
                
                wordInfo.appendChild(wordDiv);
                wordInfo.appendChild(translationDiv);
                
                const metaDiv = document.createElement('div');
                metaDiv.className = 'meta';
                
                const wrongSpan = document.createElement('span');
                wrongSpan.textContent = `答错: ${wrongCount}次`;
                
                const masteredSpan = document.createElement('span');
                masteredSpan.textContent = `掌握: ${masteredDate}`;
                
                metaDiv.appendChild(wrongSpan);
                metaDiv.appendChild(masteredSpan);
                
                item.appendChild(wordInfo);
                item.appendChild(metaDiv);
                
                fragment.appendChild(item);
            });
        }
        
        listElement.appendChild(fragment);
        
        // 切换到已掌握列表视图
        this.showView('view-mastered-list');
    }

    renderErrorList(words) {
        const listElement = this.getElement('error-list');
        const countElement = this.getElement('error-count');
        
        if (!listElement) {
            console.error('找不到错误列表元素');
            return;
        }

        // 更新计数
        if (countElement) {
            countElement.textContent = words.length;
        }

        // 清空列表
        listElement.innerHTML = '';

        // 使用DocumentFragment优化DOM操作
        const fragment = document.createDocumentFragment();

        // 渲染单词列表
        if (words.length === 0) {
            const emptyMessage = document.createElement('div');
            emptyMessage.style.textAlign = 'center';
            emptyMessage.style.padding = '40px';
            emptyMessage.style.color = '#999';
            emptyMessage.textContent = '还没有答错任何单词';
            fragment.appendChild(emptyMessage);
        } else {
            words.forEach(word => {
                const item = document.createElement('div');
                item.className = 'word-item error-item';
                
                const progress = word.progress || {};
                const wrongCount = progress.wrongCount || 0;
                const lastWrongDate = progress.lastWrongDate || '';

                // 使用安全的DOM操作，避免innerHTML XSS风险
                const wordInfo = document.createElement('div');
                
                const wordDiv = document.createElement('div');
                wordDiv.className = 'word';
                wordDiv.textContent = word.word || '';
                
                const translationDiv = document.createElement('div');
                translationDiv.className = 'translation';
                translationDiv.textContent = word.translation || '';
                
                wordInfo.appendChild(wordDiv);
                wordInfo.appendChild(translationDiv);
                
                const metaDiv = document.createElement('div');
                metaDiv.className = 'meta';
                
                const wrongSpan = document.createElement('span');
                wrongSpan.textContent = `答错: ${wrongCount}次`;
                
                const lastWrongSpan = document.createElement('span');
                lastWrongSpan.textContent = `最近错误: ${lastWrongDate}`;
                
                metaDiv.appendChild(wrongSpan);
                metaDiv.appendChild(lastWrongSpan);
                
                item.appendChild(wordInfo);
                item.appendChild(metaDiv);
                
                fragment.appendChild(item);
            });
        }
        
        listElement.appendChild(fragment);
        
        // 切换到错误列表视图
        this.showView('view-error-list');
    }

    renderSummarySummary(results) {
        const totalElement = document.getElementById('summary-total');
        const correctElement = document.getElementById('summary-correct');
        const wrongElement = document.getElementById('summary-wrong');
        const masteredElement = document.getElementById('summary-mastered');

        if (totalElement) totalElement.textContent = results.total;
        if (correctElement) correctElement.textContent = results.correct;
        if (wrongElement) wrongElement.textContent = results.wrong;
        if (masteredElement) masteredElement.textContent = results.newlyMastered;

        this.showView('view-complete-summary');
    }

    // 渲染学习统计数据
    renderLearningStatistics(statistics) {
        const totalMasteredElement = document.getElementById('stat-total-mastered');
        const consecutiveDaysElement = document.getElementById('stat-consecutive-days');
        const totalWrongElement = document.getElementById('stat-total-wrong');
        const totalDaysElement = document.getElementById('stat-total-days');

        if (totalMasteredElement) {
            totalMasteredElement.textContent = statistics.totalMastered;
        }
        if (consecutiveDaysElement) {
            consecutiveDaysElement.textContent = statistics.consecutiveDays;
        }
        if (totalWrongElement) {
            totalWrongElement.textContent = statistics.totalWrongAnswers;
        }
        if (totalDaysElement) {
            totalDaysElement.textContent = statistics.totalStudyDays;
        }
    }

    getCurrentView() {
        return this.currentView;
    }

    hideFeedback() {
        const feedbackElement = this.getElement('feedback-message');
        if (feedbackElement) {
            feedbackElement.textContent = '';
            feedbackElement.className = 'feedback-message';
        }
    }

    clearOptions() {
        const options = document.querySelectorAll('.option-btn');
        options.forEach(option => {
            option.classList.remove('correct', 'wrong');
            option.disabled = false;
        });
    }

    // 批量更新DOM元素，减少重绘
    batchUpdate(updates) {
        requestAnimationFrame(() => {
            updates.forEach(update => {
                const element = this.getElement(update.id);
                if (element) {
                    if (update.property === 'textContent') {
                        element.textContent = update.value;
                    } else if (update.property === 'className') {
                        element.className = update.value;
                    } else if (update.property === 'style') {
                        Object.assign(element.style, update.value);
                    } else {
                        element[update.property] = update.value;
                    }
                }
            });
        });
    }

    // 防抖函数
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    // 节流函数
    throttle(func, limit) {
        let inThrottle;
        return function(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }

    // 显示错误消息
    showErrorMessage(message) {
        console.error('Error:', message);
        alert(message); // 简单的错误显示，可以改进为更友好的UI
    }

    // 清除缓存
    clearCache() {
        this.cachedElements = {};
    }
}