class WordBankLoader {
    constructor() {
        this.wordBanks = {};
        this.loadedTypes = new Set();
    }

    async loadWordBank(type) {
        if (this.loadedTypes.has(type) && this.wordBanks[type]) {
            return this.wordBanks[type];
        }

        try {
            const filePath = `src/data/${type}.json`;
            
            // 使用 fetch API，带有超时和更好的错误处理
            const controller = new (window.AbortController || (function() {
                // Polyfill for AbortController
                function AbortController() {
                    this.signal = {};
                    this.abort = function() {};
                }
                return AbortController;
            }))();
            
            const timeoutId = setTimeout(() => {
                controller.abort();
            }, 10000); // 10秒超时
            
            let response;
            try {
                response = await fetch(filePath, {
                    signal: controller.signal,
                    cache: 'default'
                });
            } catch (fetchError) {
                clearTimeout(timeoutId);
                console.error(`Fetch error loading word bank (${type}):`, fetchError);
                throw new Error(`网络请求失败: ${fetchError.message}`);
            }
            
            clearTimeout(timeoutId);
            
            if (!response.ok) {
                throw new Error(`Failed to load word bank: ${response.statusText} (${response.status})`);
            }

            let words;
            try {
                words = await response.json();
            } catch (jsonError) {
                console.error(`JSON parse error for word bank (${type}):`, jsonError);
                throw new Error(`解析单词库数据失败: ${jsonError.message}`);
            }
            
            // 验证数据格式
            if (!Array.isArray(words)) {
                throw new Error(`单词库数据格式错误: 期望数组，实际为 ${typeof words}`);
            }
            
            this.wordBanks[type] = words;
            this.loadedTypes.add(type);
            
            console.log(`Successfully loaded word bank (${type}) with ${words.length} words`);
            return words;
        } catch (error) {
            console.error(`加载单词库失败 (${type}):`, error);
            
            // 显示用户友好的错误消息
            if (window.uiManager && window.uiManager.showErrorMessage) {
                window.uiManager.showErrorMessage(`加载单词库失败: ${error.message}`);
            }
            
            return [];
        }
    }

    getAllWords(type) {
        if (!this.loadedTypes.has(type)) {
            console.warn(`单词库 ${type} 尚未加载`);
            return [];
        }
        return this.wordBanks[type] || [];
    }

    getRandomDistractors(currentWord, count, wordBankType) {
        const allWords = this.getAllWords(wordBankType);
        
        // 过滤掉当前单词，避免重复
        const otherWords = allWords.filter(word => word.word !== currentWord);
        
        // 如果可选单词不足，返回所有可用的单词
        if (otherWords.length <= count) {
            return otherWords.map(word => word.translation);
        }

        // 随机选择干扰项
        const distractors = [];
        const shuffled = [...otherWords].sort(() => Math.random() - 0.5);
        
        for (let i = 0; i < count; i++) {
            distractors.push(shuffled[i].translation);
        }

        return distractors;
    }

    getWordByWord(word, wordBankType) {
        const allWords = this.getAllWords(wordBankType);
        return allWords.find(w => w.word === word) || null;
    }

    getRandomWords(count, wordBankType, excludeWords = []) {
        const allWords = this.getAllWords(wordBankType);
        
        // 过滤掉需要排除的单词
        const availableWords = allWords.filter(word => 
            !excludeWords.includes(word.word)
        );

        // 如果可用单词不足，返回所有可用的单词
        if (availableWords.length <= count) {
            return availableWords;
        }

        // 随机选择单词
        const shuffled = [...availableWords].sort(() => Math.random() - 0.5);
        return shuffled.slice(0, count);
    }

    getWordBankSize(wordBankType) {
        return this.getAllWords(wordBankType).length;
    }

    getWordBank(wordBankType) {
        return this.getAllWords(wordBankType);
    }

    isLoaded(wordBankType) {
        return this.loadedTypes.has(wordBankType);
    }

    // 预加载单词库
    async preloadWordBank(type) {
        if (!this.loadedTypes.has(type)) {
            console.log(`Preloading word bank: ${type}`);
            return this.loadWordBank(type);
        }
        return this.wordBanks[type];
    }

    // 批量预加载多个单词库
    async preloadWordBanks(types) {
        const promises = types.map(type => this.preloadWordBank(type));
        return Promise.all(promises);
    }

    // 清除缓存
    clearCache(wordBankType = null) {
        if (wordBankType) {
            delete this.wordBanks[wordBankType];
            this.loadedTypes.delete(wordBankType);
            console.log(`Cleared cache for word bank: ${wordBankType}`);
        } else {
            this.wordBanks = {};
            this.loadedTypes.clear();
            console.log('Cleared all word bank caches');
        }
    }

    // 获取缓存统计信息
    getCacheStats() {
        const stats = {};
        for (const type of this.loadedTypes) {
            const words = this.wordBanks[type];
            stats[type] = {
                wordCount: words.length,
                sizeBytes: new Blob([JSON.stringify(words)]).size
            };
        }
        return stats;
    }
}