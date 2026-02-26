class StorageManager {
    static STORAGE_KEY = 'wordApp_data';

    constructor() {
        this.storageKey = StorageManager.STORAGE_KEY;
        this.storageAvailable = this.checkStorageAvailable();
    }

    // 检查localStorage是否可用
    checkStorageAvailable() {
        try {
            const test = '__storage_test__';
            localStorage.setItem(test, test);
            localStorage.removeItem(test);
            return true;
        } catch (e) {
            console.error('localStorage not available:', e);
            return false;
        }
    }

    // 获取剩余存储空间（估计）
    getRemainingSpace() {
        if (!this.storageAvailable) {
            return 0;
        }
        try {
            const testKey = '__space_test__';
            let data = 'x';
            try {
                while (true) {
                    localStorage.setItem(testKey, data);
                    data += data;
                }
            } catch (e) {
                localStorage.removeItem(testKey);
                return data.length;
            }
        } catch (e) {
            return 0;
        }
    }

    saveUserData(data) {
        if (!this.storageAvailable) {
            console.error('localStorage not available, cannot save data');
            return false;
        }

        try {
            const jsonData = JSON.stringify(data);
            
            // 检查数据大小（防止存储空间不足）
            const dataSize = new Blob([jsonData]).size;
            if (dataSize > 4 * 1024 * 1024) { // 4MB限制
                console.error('Data too large to save:', dataSize);
                return false;
            }
            
            localStorage.setItem(this.storageKey, jsonData);
            console.log('User data saved successfully, size:', dataSize);
            return true;
        } catch (error) {
            console.error('保存用户数据失败:', error);
            
            // 检查是否是存储空间不足的错误
            if (error.name === 'QuotaExceededError' || error.code === 22) {
                console.error('Storage quota exceeded');
                if (window.uiManager && window.uiManager.showErrorMessage) {
                    window.uiManager.showErrorMessage('存储空间不足，无法保存学习进度。请清理浏览器缓存或删除一些数据。');
                }
            }
            
            return false;
        }
    }

    loadUserData() {
        if (!this.storageAvailable) {
            console.log('localStorage not available, returning null');
            return null;
        }

        try {
            const jsonData = localStorage.getItem(this.storageKey);
            console.log('loadUserData called, data found:', !!jsonData);
            
            if (jsonData === null) {
                console.log('No user data found in localStorage');
                return null;
            }
            
            const parsed = JSON.parse(jsonData);
            console.log('User data loaded successfully');
            return parsed;
        } catch (error) {
            console.error('加载用户数据失败:', error);
            
            // 如果数据损坏，尝试清除
            if (error instanceof SyntaxError) {
                console.error('Data corrupted, attempting to clear');
                try {
                    localStorage.removeItem(this.storageKey);
                } catch (clearError) {
                    console.error('Failed to clear corrupted data:', clearError);
                }
            }
            
            return null;
        }
    }

    hasUserData() {
        if (!this.storageAvailable) {
            return false;
        }
        return localStorage.getItem(this.storageKey) !== null;
    }

    clearUserData() {
        if (!this.storageAvailable) {
            console.error('localStorage not available, cannot clear data');
            return false;
        }

        try {
            localStorage.removeItem(this.storageKey);
            console.log('User data cleared successfully');
            return true;
        } catch (error) {
            console.error('清除用户数据失败:', error);
            return false;
        }
    }

    updateWordProgress(word, progressData) {
        const userData = this.loadUserData() || this.getDefaultUserData();
        userData.wordProgress[word] = progressData;
        return this.saveUserData(userData);
    }

    getWordProgress(word) {
        const userData = this.loadUserData();
        if (!userData || !userData.wordProgress) {
            return null;
        }
        return userData.wordProgress[word] || null;
    }

    getDefaultUserData() {
        return {
            currentWordBankType: null,
            wordProgress: {},
            dailyWords: [],
            lastStudyDate: null,
            lastView: null,
            statistics: {
                totalMastered: 0,
                consecutiveDays: 0,
                totalWrongAnswers: 0,
                totalStudyDays: 0,
                lastStudyDateString: null,
                firstStudyDate: null
            }
        };
    }

    // 统计功能方法

    // 获取总掌握单词数
    getTotalMastered() {
        const userData = this.loadUserData();
        if (!userData || !userData.wordProgress) {
            return 0;
        }
        return Object.values(userData.wordProgress).filter(p => p.status === 'mastered').length;
    }

    // 获取总答错次数
    getTotalWrongAnswers() {
        const userData = this.loadUserData();
        if (!userData || !userData.wordProgress) {
            return 0;
        }
        return Object.values(userData.wordProgress).reduce((sum, p) => sum + (p.wrongCount || 0), 0);
    }

    // 获取连续学习天数
    getConsecutiveDays() {
        const userData = this.loadUserData();
        if (!userData || !userData.lastStudyDate) {
            return 0;
        }

        // 如果有保存的连续天数，直接返回
        if (userData.statistics && userData.statistics.consecutiveDays !== undefined) {
            return userData.statistics.consecutiveDays;
        }

        return 0;
    }

    // 获取总学习天数
    getTotalStudyDays() {
        const userData = this.loadUserData();
        if (!userData || !userData.statistics || !userData.statistics.studyDates) {
            return userData.lastStudyDate ? 1 : 0;
        }
        return userData.statistics.studyDates.length;
    }

    // 更新统计数据
    updateStatistics() {
        const userData = this.loadUserData() || this.getDefaultUserData();
        
        // 获取统计信息
        const totalMastered = this.getTotalMastered();
        const totalWrongAnswers = this.getTotalWrongAnswers();
        
        // 更新学习日期记录
        if (!userData.statistics.studyDates) {
            userData.statistics.studyDates = [];
        }
        
        const todayString = this.getTodayDateString();
        if (!userData.statistics.studyDates.includes(todayString)) {
            userData.statistics.studyDates.push(todayString);
        }

        // 记录首次学习日期
        if (!userData.statistics.firstStudyDate) {
            userData.statistics.firstStudyDate = todayString;
        }

        // 记录最后学习日期
        userData.statistics.lastStudyDateString = todayString;

        // 更新统计数据
        userData.statistics.totalMastered = totalMastered;
        userData.statistics.totalWrongAnswers = totalWrongAnswers;
        userData.statistics.totalStudyDays = userData.statistics.studyDates.length;
        
        // 计算连续学习天数
        userData.statistics.consecutiveDays = this.calculateConsecutiveDays(userData.statistics.studyDates);

        return this.saveUserData(userData);
    }

    // 获取今天的日期字符串
    getTodayDateString() {
        const today = new Date();
        return today.toISOString().split('T')[0];
    }

    // 计算连续学习天数
    calculateConsecutiveDays(studyDates) {
        if (!studyDates || studyDates.length === 0) {
            return 0;
        }

        const sortedDates = [...studyDates].sort().reverse();
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const todayString = today.toISOString().split('T')[0];
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayString = yesterday.toISOString().split('T')[0];

        // 如果最近学习日期不是今天或昨天，连续天数重置
        if (sortedDates[0] !== todayString && sortedDates[0] !== yesterdayString) {
            return 0;
        }

        let consecutiveDays = 0;
        let checkDate = sortedDates[0] ? new Date(sortedDates[0]) : null;

        while (checkDate) {
            const checkDateString = checkDate.toISOString().split('T')[0];
            if (sortedDates.includes(checkDateString)) {
                consecutiveDays++;
                checkDate.setDate(checkDate.getDate() - 1);
            } else {
                break;
            }
        }

        return consecutiveDays;
    }

    // 获取完整统计数据
    getStatistics() {
        const userData = this.loadUserData();
        if (!userData || !userData.statistics) {
            return {
                totalMastered: 0,
                consecutiveDays: 0,
                totalWrongAnswers: 0,
                totalStudyDays: 0,
                lastStudyDate: null,
                firstStudyDate: null
            };
        }

        // 实时计算统计数据
        const totalMastered = this.getTotalMastered();
        const totalWrongAnswers = this.getTotalWrongAnswers();
        
        return {
            totalMastered: totalMastered,
            consecutiveDays: userData.statistics.consecutiveDays || 0,
            totalWrongAnswers: totalWrongAnswers,
            totalStudyDays: userData.statistics.totalStudyDays || 0,
            lastStudyDate: userData.statistics.lastStudyDateString,
            firstStudyDate: userData.statistics.firstStudyDate
        };
    }
}