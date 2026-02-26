class WordScheduler {
    constructor() {
        this.DAILY_WORD_COUNT = 25;
    }

    isNewDay(lastStudyDate) {
        if (!lastStudyDate) {
            return true;
        }

        const today = new Date();
        const lastDate = new Date(lastStudyDate);
        
        return (
            today.getFullYear() !== lastDate.getFullYear() ||
            today.getMonth() !== lastDate.getMonth() ||
            today.getDate() !== lastDate.getDate()
        );
    }

    getTodayDateString() {
        const today = new Date();
        return today.toISOString().split('T')[0];
    }

    generateDailyWords(wordBank, userData) {
        const dailyWords = [];
        const allWords = [...wordBank];
        const wordProgress = userData.wordProgress || {};
        
        // 1. 收集已掌握的单词（需要排除）
        const masteredWords = this.getMasteredWords(wordProgress);
        
        // 2. 收集未学习的单词
        const unlearnedWords = allWords.filter(word => 
            !wordProgress[word.word] && 
            !masteredWords.includes(word.word)
        );

        // 从未学习的单词中随机选择25个
        const shuffled = this.shuffleArray(unlearnedWords);
        const selected = shuffled.slice(0, this.DAILY_WORD_COUNT);
        dailyWords.push(...selected);

        // 如果不足25个（单词库用完了），从已掌握的单词中随机选择一些复习
        if (dailyWords.length < this.DAILY_WORD_COUNT) {
            const needed = this.DAILY_WORD_COUNT - dailyWords.length;
            const masteredWordObjects = allWords.filter(word => 
                masteredWords.includes(word.word)
            );
            const shuffled = this.shuffleArray(masteredWordObjects);
            const selected = shuffled.slice(0, needed);
            dailyWords.push(...selected);
        }

        return dailyWords;
    }

    getMasteredWords(wordProgress) {
        const masteredWords = [];
        for (const [word, progress] of Object.entries(wordProgress)) {
            if (progress.status === 'mastered') {
                masteredWords.push(word);
            }
        }
        return masteredWords;
    }

    shuffleArray(array) {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }

    shouldGenerateNewWords(userData) {
        const lastStudyDate = userData.lastStudyDate;
        return this.isNewDay(lastStudyDate);
    }

    generateDailyWordsData(dailyWords) {
        return dailyWords.map(word => word.word);
    }
}