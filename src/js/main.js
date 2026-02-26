// 全局实例
let storageManager;
let wordBankLoader;
let wordScheduler;
let quizHandler;
let uiManager;

// 当前状态
let currentWordBankType = null;
let dailyWords = [];

// 初始化应用
async function initApp() {
    console.log('=== Application Initialization Started ===');
    const startTime = performance.now();
    
    // 创建模块实例
    storageManager = new StorageManager();
    wordBankLoader = new WordBankLoader();
    wordScheduler = new WordScheduler();
    quizHandler = new QuizHandler(storageManager, wordBankLoader);
    uiManager = new UIManager();

    console.log('Modules initialized');

    // 绑定事件监听器
    bindEventListeners();

    console.log('Event listeners bound');

    // 预加载常用单词库（性能优化）
    console.log('Preloading word banks...');
    wordBankLoader.preloadWordBank('ielts').catch(err => {
        console.warn('Failed to preload IELTS word bank:', err);
    });
    wordBankLoader.preloadWordBank('cet6').catch(err => {
        console.warn('Failed to preload CET6 word bank:', err);
    });

    // 检查用户数据并决定显示哪个页面
    const userData = storageManager.loadUserData();
    console.log('User data on startup:', userData);
    
    if (!userData || !userData.currentWordBankType) {
        console.log('First time use or no word bank type, showing selector');
        // 首次使用，显示单词库选择页
        uiManager.showView('view-wordbank-selector');
    } else {
        console.log('Existing user data found, currentWordBankType:', userData.currentWordBankType);
        // 已有用户数据，先加载单词库
        currentWordBankType = userData.currentWordBankType;
        await wordBankLoader.loadWordBank(currentWordBankType);
        
        // 优先检查上次所在的视图
        const lastView = userData.lastView;
        const hasMasteredWords = Object.values(userData.wordProgress || {}).some(p => p.status === 'mastered');
        
        console.log('Last view:', lastView, 'Has mastered words:', hasMasteredWords);
        
        if (lastView === 'view-mastered-list' && hasMasteredWords) {
            // 如果上次在已掌握列表页面且有已掌握单词，显示已掌握列表
            console.log('Showing mastered list');
            showMasteredList();
        } else if (lastView === 'view-complete-summary') {
            // 如果上次在完成总结页面，使用保存的答题结果显示统计数据
            console.log('Showing completion summary');
            const lastResults = userData.lastQuizResults;
            if (lastResults) {
                uiManager.renderSummarySummary(lastResults);
                // 获取并渲染统计数据
                const statistics = storageManager.getStatistics();
                uiManager.renderLearningStatistics(statistics);
            } else {
                uiManager.showView('view-complete-summary');
            }
        } else if (lastView === 'view-daily-quiz') {
            // 如果上次在测试页面，根据日期决定是否生成新单词
            console.log('Last view was quiz, checking if new words needed');
            if (wordScheduler.shouldGenerateNewWords(userData)) {
                await generateNewDailyWords();
            } else {
                dailyWords = userData.dailyWords.map(word => 
                    wordBankLoader.getWordByWord(word, currentWordBankType)
                ).filter(word => word !== null);
            }
            startQuiz();
        } else {
            // 其他情况（包括 lastView 为 null），根据日期决定是否生成新单词
            console.log('Default case, checking if new words needed');
            if (wordScheduler.shouldGenerateNewWords(userData)) {
                await generateNewDailyWords();
            } else {
                dailyWords = userData.dailyWords.map(word => 
                    wordBankLoader.getWordByWord(word, currentWordBankType)
                ).filter(word => word !== null);
            }
            startQuiz();
        }
    }
    
    const endTime = performance.now();
    console.log(`=== Application Initialization Complete (took ${(endTime - startTime).toFixed(2)}ms) ===`);
    
    // 性能监控日志
    if (window.performance && window.performance.memory) {
        console.log('Memory usage:', {
            usedJSHeapSize: Math.round(window.performance.memory.usedJSHeapSize / 1024 / 1024) + ' MB',
            totalJSHeapSize: Math.round(window.performance.memory.totalJSHeapSize / 1024 / 1024) + ' MB',
            jsHeapSizeLimit: Math.round(window.performance.memory.jsHeapSizeLimit / 1024 / 1024) + ' MB'
        });
    }
}

// 生成新的每日单词
async function generateNewDailyWords() {
    // 加载单词库
    const wordBank = await wordBankLoader.loadWordBank(currentWordBankType);
    
    if (!wordBank || wordBank.length === 0) {
        console.error('单词库加载失败');
        return;
    }

    // 获取用户数据
    const userData = storageManager.loadUserData() || storageManager.getDefaultUserData();
    userData.currentWordBankType = currentWordBankType;

    // 生成每日单词
    dailyWords = wordScheduler.generateDailyWords(wordBank, userData);
    
    // 保存每日单词
    userData.dailyWords = dailyWords.map(word => word.word);
    userData.lastStudyDate = wordScheduler.getTodayDateString();
    
    storageManager.saveUserData(userData);
}

// 开始测试
function startQuiz() {
    if (dailyWords.length === 0) {
        console.error('没有每日单词');
        return;
    }

    // 开始答题
    quizHandler.startQuiz(dailyWords, currentWordBankType);
    
    // 显示测试页面
    uiManager.showView('view-daily-quiz');
    
    // 保存视图状态
    const userData = storageManager.loadUserData();
    if (userData) {
        userData.lastView = 'view-daily-quiz';
        storageManager.saveUserData(userData);
    }
    
    // 渲染第一个单词
    renderCurrentWord();
}

// 渲染当前单词
function renderCurrentWord() {
    const quizData = quizHandler.loadCurrentWord();
    
    if (!quizData) {
        // 答题完成，显示总结
        showQuizComplete();
        return;
    }

    // 更新进度
    const progress = quizHandler.getCurrentProgress();
    uiManager.updateProgress(progress.current, progress.total);

    // 渲染单词和选项
    uiManager.renderQuizWord(quizData.word, quizData.options);
}

// 处理答题
function handleAnswer(selectedTranslation) {
    // 获取答案结果
    const result = quizHandler.handleAnswer(selectedTranslation);
    
    // 显示反馈
    uiManager.showFeedback(result.isCorrect, result.correctTranslation);
    
    // 高亮选中的选项
    const selectedButton = document.querySelector(`.option-btn[data-translation="${selectedTranslation}"]`);
    if (selectedButton) {
        uiManager.highlightOption(selectedButton, result.isCorrect);
    }

    // 禁用所有选项
    uiManager.disableAllOptions();

    // 获取当前进度
    const progress = quizHandler.getCurrentProgress();

    // 如果答错，显示下一题按钮
    if (!result.isCorrect) {
        const nextBtn = document.getElementById('next-question-btn');
        if (nextBtn) {
            nextBtn.style.display = 'block';
        }
    } else {
        // 答对，延迟后自动进入下一个单词或完成页面
        setTimeout(() => {
            if (progress.current >= progress.total) {
                showQuizComplete();
            } else {
                quizHandler.nextWord();
                renderCurrentWord();
            }
        }, 1000);
    }
}

// 下一题按钮点击事件
function handleNextQuestion() {
    const progress = quizHandler.getCurrentProgress();
    
    // 如果已经是最后一题了，跳转到完成页面
    if (progress.current >= progress.total) {
        showQuizComplete();
    } else {
        quizHandler.nextWord();
        renderCurrentWord();
        
        // 隐藏下一题按钮
        const nextBtn = document.getElementById('next-question-btn');
        if (nextBtn) {
            nextBtn.style.display = 'none';
        }
    }
}

// 显示答题完成总结
function showQuizComplete() {
    const results = quizHandler.getQuizResults();
    
    // 保存学习进度和视图状态
    const userData = storageManager.loadUserData();
    userData.lastStudyDate = wordScheduler.getTodayDateString();
    userData.lastView = 'view-complete-summary';
    // 保存今日答题结果
    userData.lastQuizResults = results;
    storageManager.saveUserData(userData);
    
    // 更新学习统计数据
    storageManager.updateStatistics();
    
    // 获取统计数据
    const statistics = storageManager.getStatistics();
    
    // 渲染完成总结和统计数据
    uiManager.renderSummarySummary(results);
    uiManager.renderLearningStatistics(statistics);
}

// 查看已掌握列表
function showMasteredList() {
    console.log('showMasteredList called');
    const userData = storageManager.loadUserData();
    console.log('userData:', userData);
    
    if (!userData || !userData.wordProgress) {
        console.log('No user data or wordProgress found');
        uiManager.renderMasteredList([]);
        return;
    }

    // 保存当前视图状态
    userData.lastView = 'view-mastered-list';
    storageManager.saveUserData(userData);

    console.log('currentWordBankType:', currentWordBankType);
    console.log('wordBank loaded:', wordBankLoader.isLoaded(currentWordBankType));

    // 确保单词库已加载
    if (!wordBankLoader.isLoaded(currentWordBankType)) {
        console.log('Loading word bank...');
        wordBankLoader.loadWordBank(currentWordBankType).then(() => {
            console.log('Word bank loaded, rendering list');
            renderMasteredListFromData(userData);
        }).catch(error => {
            console.error('Error loading word bank:', error);
        });
    } else {
        console.log('Word bank already loaded, rendering list');
        renderMasteredListFromData(userData);
    }
}

// 查看错误列表
function showErrorList() {
    console.log('showErrorList called');
    const userData = storageManager.loadUserData();
    console.log('userData:', userData);
    
    if (!userData || !userData.wordProgress) {
        console.log('No user data or wordProgress found');
        uiManager.renderErrorList([]);
        return;
    }

    // 保存当前视图状态
    userData.lastView = 'view-error-list';
    storageManager.saveUserData(userData);

    console.log('currentWordBankType:', currentWordBankType);
    console.log('wordBank loaded:', wordBankLoader.isLoaded(currentWordBankType));

    // 确保单词库已加载
    if (!wordBankLoader.isLoaded(currentWordBankType)) {
        console.log('Loading word bank...');
        wordBankLoader.loadWordBank(currentWordBankType).then(() => {
            console.log('Word bank loaded, rendering error list');
            renderErrorListFromData(userData);
        }).catch(error => {
            console.error('Error loading word bank:', error);
        });
    } else {
        console.log('Word bank already loaded, rendering error list');
        renderErrorListFromData(userData);
    }
}

// 当前错误单词列表（用于显示）
let currentErrorWords = [];

function renderErrorListFromData(userData) {
    console.log('renderErrorListFromData called');
    console.log('wordProgress:', userData.wordProgress);
    
    const errorWords = [];
    for (const [word, progress] of Object.entries(userData.wordProgress)) {
        console.log(`Checking word: ${word}, wrongCount: ${progress.wrongCount}`);
        if (progress.wrongCount && progress.wrongCount > 0) {
            const wordData = wordBankLoader.getWordByWord(word, currentWordBankType);
            console.log(`Word data for ${word}:`, wordData);
            if (wordData) {
                errorWords.push({
                    ...wordData,
                    progress: progress
                });
            }
        }
    }

    // 保存当前错误单词列表
    currentErrorWords = errorWords;

    console.log('Error words to render:', errorWords);
    uiManager.renderErrorList(errorWords);
}

function renderMasteredListFromData(userData) {
    console.log('renderMasteredListFromData called');
    console.log('wordProgress:', userData.wordProgress);
    
    const masteredWords = [];
    for (const [word, progress] of Object.entries(userData.wordProgress)) {
        console.log(`Checking word: ${word}, status: ${progress.status}`);
        if (progress.status === 'mastered') {
            const wordData = wordBankLoader.getWordByWord(word, currentWordBankType);
            console.log(`Word data for ${word}:`, wordData);
            if (wordData) {
                masteredWords.push({
                    ...wordData,
                    progress: progress
                });
            }
        }
    }

    console.log('Mastered words to render:', masteredWords);
    uiManager.renderMasteredList(masteredWords);
}

// 开始新的一天
async function startNewDay() {
    await generateNewDailyWords();
    startQuiz();
}

// 绑定事件监听器
function bindEventListeners() {
    // 单词库选择卡片点击事件
    document.querySelectorAll('.wordbank-card').forEach(card => {
        card.addEventListener('click', async () => {
            currentWordBankType = card.dataset.wordbank;
            
            // 保存用户选择的单词库
            const userData = storageManager.loadUserData() || storageManager.getDefaultUserData();
            userData.currentWordBankType = currentWordBankType;
            storageManager.saveUserData(userData);
            
            // 生成每日单词并开始测试
            await generateNewDailyWords();
            startQuiz();
        });
    });

    // 选项点击事件（事件委托）
    document.getElementById('options-container').addEventListener('click', (e) => {
        if (e.target.classList.contains('option-btn') && !e.target.disabled) {
            const selectedTranslation = e.target.dataset.translation;
            handleAnswer(selectedTranslation);
        }
    });

    // 下一题按钮点击事件
    const nextQuestionBtn = document.getElementById('next-question-btn');
    if (nextQuestionBtn) {
        nextQuestionBtn.addEventListener('click', handleNextQuestion);
    }

    // 查看已掌握列表按钮
    const viewMasteredBtn = document.getElementById('view-mastered-btn');
    if (viewMasteredBtn) {
        console.log('view-mastered-btn found, binding event listener');
        viewMasteredBtn.addEventListener('click', (e) => {
            console.log('view-mastered-btn clicked', e);
            showMasteredList();
        });
    } else {
        console.error('view-mastered-btn not found');
    }

    // 查看错误列表按钮
    const viewErrorBtn = document.getElementById('view-error-btn');
    if (viewErrorBtn) {
        console.log('view-error-btn found, binding event listener');
        viewErrorBtn.addEventListener('click', (e) => {
            console.log('view-error-btn clicked', e);
            showErrorList();
        });
    } else {
        console.error('view-error-btn not found');
    }

    // 开始新的一天按钮
    const newDayBtn = document.getElementById('new-day-btn');
    if (newDayBtn) {
        newDayBtn.addEventListener('click', startNewDay);
    }

    // 返回按钮（已掌握列表）
    const backBtn = document.getElementById('back-btn');
    if (backBtn) {
        backBtn.addEventListener('click', () => {
            uiManager.showView('view-complete-summary');
        });
    }

    // 返回按钮（错误列表）
    const errorBackBtn = document.getElementById('error-back-btn');
    if (errorBackBtn) {
        errorBackBtn.addEventListener('click', () => {
            uiManager.showView('view-complete-summary');
        });
    }
}

// 页面加载完成后初始化应用
document.addEventListener('DOMContentLoaded', initApp);