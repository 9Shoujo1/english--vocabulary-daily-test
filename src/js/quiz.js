class QuizHandler {
    constructor(storageManager, wordBankLoader) {
        this.storageManager = storageManager;
        this.wordBankLoader = wordBankLoader;
        this.currentWord = null;
        this.currentOptions = [];
        this.currentIndex = 0;
        this.dailyWords = [];
        this.answers = []; // 记录答题结果 {word, isCorrect, selectedTranslation}
        this.currentWordBankType = null;
    }

    startQuiz(dailyWords, wordBankType) {
        this.dailyWords = dailyWords;
        this.currentIndex = 0;
        this.answers = [];
        this.currentWordBankType = wordBankType;
        this.loadCurrentWord();
    }

    loadCurrentWord() {
        if (this.currentIndex >= this.dailyWords.length) {
            return null;
        }

        this.currentWord = this.dailyWords[this.currentIndex];
        
        // 生成选项（1个正确 + 3个错误）
        const correctTranslation = this.currentWord.translation;
        const distractors = this.wordBankLoader.getRandomDistractors(
            this.currentWord.word,
            3,
            this.currentWordBankType
        );

        // 将正确答案和干扰项混合并打乱
        this.currentOptions = this.shuffleOptions([
            { translation: correctTranslation, isCorrect: true },
            ...distractors.map(translation => ({ translation, isCorrect: false }))
        ]);

        return {
            word: this.currentWord,
            options: this.currentOptions
        };
    }

    shuffleOptions(options) {
        const shuffled = [...options];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }

    handleAnswer(selectedTranslation) {
        if (!this.currentWord) {
            return { isCorrect: false, message: '没有当前单词' };
        }

        const selectedOption = this.currentOptions.find(
            option => option.translation === selectedTranslation
        );

        if (!selectedOption) {
            return { isCorrect: false, message: '无效的选择' };
        }

        const isCorrect = selectedOption.isCorrect;
        
        // 记录答题结果
        this.answers.push({
            word: this.currentWord.word,
            translation: this.currentWord.translation,
            selectedTranslation: selectedTranslation,
            isCorrect: isCorrect
        });

        // 更新单词进度
        this.updateWordProgress(this.currentWord.word, isCorrect);

        // 判断是否完成（当前是最后一题）
        const isComplete = this.currentIndex >= this.dailyWords.length - 1;

        return {
            isCorrect: isCorrect,
            correctTranslation: this.currentWord.translation,
            isComplete: isComplete
        };
    }

    updateWordProgress(word, isCorrect) {
        const today = new Date().toISOString().split('T')[0];
        let progress = this.storageManager.getWordProgress(word);

        if (isCorrect) {
            // 答对：标记为已掌握
            progress = {
                status: 'mastered',
                wrongCount: progress ? progress.wrongCount : 0,
                lastWrongDate: progress ? progress.lastWrongDate : null,
                masteredDate: today
            };
        } else {
            // 答错：标记为错误，增加错误计数
            progress = {
                status: 'wrong',
                wrongCount: (progress ? progress.wrongCount : 0) + 1,
                lastWrongDate: today,
                masteredDate: progress ? progress.masteredDate : null
            };
        }

        this.storageManager.updateWordProgress(word, progress);
    }

    nextWord() {
        this.currentIndex++;
        return this.loadCurrentWord();
    }

    isComplete() {
        return this.currentIndex >= this.dailyWords.length - 1;
    }

    getCurrentProgress() {
        return {
            current: this.currentIndex + 1,
            total: this.dailyWords.length
        };
    }

    getQuizResults() {
        const correctCount = this.answers.filter(a => a.isCorrect).length;
        const wrongCount = this.answers.filter(a => !a.isCorrect).length;
        
        // 计算新掌握的单词数（答对且之前不是已掌握状态的）
        const newlyMastered = this.answers.filter(answer => {
            if (!answer.isCorrect) return false;
            const progress = this.storageManager.getWordProgress(answer.word);
            return progress && progress.masteredDate === new Date().toISOString().split('T')[0];
        }).length;

        return {
            total: this.answers.length,
            correct: correctCount,
            wrong: wrongCount,
            newlyMastered: newlyMastered,
            answers: this.answers
        };
    }

    getCurrentWord() {
        return this.currentWord;
    }

    getCurrentOptions() {
        return this.currentOptions;
    }

    reset() {
        this.currentWord = null;
        this.currentOptions = [];
        this.currentIndex = 0;
        this.dailyWords = [];
        this.answers = [];
        this.currentWordBankType = null;
    }
}