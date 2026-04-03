// js/app.js

let QUESTIONS = [];

document.addEventListener('DOMContentLoaded', async () => {
    // Ladda frågor från CSV
    try {
        QUESTIONS = await loadQuestionsFromCSV("js/questions.csv");
    } catch (e) {
        console.error("Kunde inte ladda questions.csv", e);
        QUESTIONS = [];
    }

    // Elementreferenser
    const viewStart = document.getElementById('view-start');
    const viewQuiz = document.getElementById('view-quiz');
    const viewResult = document.getElementById('view-result');
    const views = [viewStart, viewQuiz, viewResult];

    const rulesButtons = document.querySelectorAll('.btn-rules');
    const rulesButtonsContainer = document.querySelector('.rules-buttons');
    const rulesSelectionHelp = document.getElementById('rules-selection-help');
    const diffButtons = document.querySelectorAll('.btn-diff');
    const btnStartQuiz = document.getElementById('btn-start-quiz');
    const btnRestart = document.getElementById('btn-restart');
    const btnDebugResetProgress = document.getElementById('btn-debug-reset-progress');

    const quizProgress = document.getElementById('quiz-progress');
    const quizStatus = document.querySelector('.quiz-status');
    const quizQuestionText = document.getElementById('quiz-question-text');
    const quizQuestionImage = document.getElementById('quiz-question-image');
    const quizAnswers = document.getElementById('quiz-answers');
    const quizFeedback = document.getElementById('quiz-feedback');
    const quizFeedbackExplanation = document.getElementById('quiz-feedback-explanation');
    const btnNextQuestion = document.getElementById('btn-next-question');
    const scoreBall = document.getElementById('score-ball');
    const scoreProgressCurrent = document.getElementById('score-progress-current');

    const currentStreakDisplay = document.getElementById('current-streak-display');
    const bestStreakDisplay = document.getElementById('best-streak-display');
    const achievementSummary = document.getElementById('achievement-summary');
    const achievementSummaryCount = document.getElementById('achievement-summary-count');
    const achievementSummaryStatus = document.getElementById('achievement-summary-status');

    const resultSummary = document.getElementById('result-summary');
    const resultAchievementsBlock = document.getElementById('result-achievements');
    const resultAchievementsNew = document.getElementById('result-achievements-new');
    const resultAchievementsAll = document.getElementById('result-achievements-all');

    const achievementsModal = document.getElementById('achievements-modal');
    const achievementsGrid = document.getElementById('achievements-grid');
    const modalClose = document.getElementById('modal-close');
    const modalOverlay = document.querySelector('.modal-overlay');

    // Tillstånd
    let selectedRules = ['5v5'];
    let selectedDifficulty = 'easy';
    let currentQuestions = [];
    let currentIndex = 0;
    let correctCount = 0;
    let roundScore = 0;
    let currentStreak = 0;
    let maxStreak = 0;
    let strikes = 0;
    let wasUtvisad = false;
    let questionResolved = false;
    let questionTimerId = null;
    let questionTimerIntervalId = null;
    let pickedAnswers = [];
    let pickedCorrectIndex = 0;

    const difficultyMultiplier = {
        'easy': 0.8,
        'medium': 1,
        'hard': 1.5,
        'expert': 2
    };

    const EXPERT_DIFFICULTY = 'expert';
    const EXPERT_TIME_LIMIT_SECONDS = 6;
    const MAX_STRIKES = 3;
    const STRIKE_TITLES = ['🤚Tillsägelse', '🟨Varning', '🟥Utvisning'];

    const TOTAL_SCORE_KEY = 'refquiz_totalScore';
    const ACHIEVEMENTS_KEY = 'refquiz_achievements';
    const CURRENT_STREAK_KEY = 'refquiz_currentStreak';
    const MAX_STREAK_KEY = 'refquiz_maxStreak';

    const ALL_ACHIEVEMENTS = [
        { name: 'Nybörjardomare', criteria: 'Uppnå 100 poäng', category: 'Poäng', threshold: 100 },
        { name: 'Diplomerad domare', criteria: 'Uppnå 250 poäng', category: 'Poäng', threshold: 250 },
        { name: 'Erfaren domare', criteria: 'Uppnå 500 poäng', category: 'Poäng', threshold: 500 },
        { name: 'Linjedomare', criteria: 'Uppnå 1000 poäng', category: 'Poäng', threshold: 1000 },
        { name: 'Assisterande domare', criteria: 'Uppnå 1500 poäng', category: 'Poäng', threshold: 1500 },
        { name: 'Huvuddomare', criteria: 'Uppnå 2000 poäng', category: 'Poäng', threshold: 2000 },
        { name: 'UEFA-domare', criteria: 'Uppnå 3000 poäng', category: 'Poäng', threshold: 3000 },
        { name: 'FIFA-domare', criteria: 'Uppnå 5000 poäng', category: 'Poäng', threshold: 5000 },
        { name: 'Stabil', criteria: 'Uppnå 10 i streak', category: 'Streak', threshold: 10 },
        { name: 'Pålitlig', criteria: 'Uppnå 25 i streak', category: 'Streak', threshold: 25 },
        { name: 'Ofelbar', criteria: 'Uppnå 50 i streak', category: 'Streak', threshold: 50 },
        { name: 'Legendarisk', criteria: 'Uppnå 100 i streak', category: 'Streak', threshold: 100 },
        { name: 'Nykomling', criteria: 'Få alla rätt på Lätt svårighet', category: 'Utmaning', difficulty: 'easy' },
        { name: 'Utmanare', criteria: 'Få alla rätt på Medel svårighet', category: 'Utmaning', difficulty: 'medium' },
        { name: 'Proffs', criteria: 'Få alla rätt på Svår svårighet', category: 'Utmaning', difficulty: 'hard' },
        { name: 'Expert', criteria: 'Få alla rätt på Expert svårighet', category: 'Utmaning', difficulty: 'expert' }
    ];
    const SCORE_ACHIEVEMENTS = ALL_ACHIEVEMENTS
        .filter(achievement => achievement.category === 'Poäng')
        .sort((firstAchievement, secondAchievement) => firstAchievement.threshold - secondAchievement.threshold);
    const STREAK_ACHIEVEMENTS = ALL_ACHIEVEMENTS
        .filter(achievement => achievement.category === 'Streak')
        .sort((firstAchievement, secondAchievement) => firstAchievement.threshold - secondAchievement.threshold);
    const CHALLENGE_ACHIEVEMENTS = ALL_ACHIEVEMENTS
        .filter(achievement => achievement.category === 'Utmaning');
    const ACHIEVEMENT_CATEGORY_ORDER = ['Poäng', 'Streak', 'Utmaning'];

    const quizStatusMeta = document.createElement('div');
    quizStatusMeta.className = 'quiz-status-meta';

    const quizTimer = document.createElement('span');
    quizTimer.id = 'quiz-timer';
    quizTimer.className = 'quiz-timer hidden';

    const quizStrikeStatus = document.createElement('span');
    quizStrikeStatus.id = 'quiz-strikes';
    quizStrikeStatus.className = 'quiz-strikes hidden';

    quizStatusMeta.appendChild(quizTimer);
    quizStatusMeta.appendChild(quizStrikeStatus);
    quizStatus.appendChild(quizStatusMeta);

    function getAchievementImageSrc(achievement) {
        if (!achievement) return '';

        if (achievement.category === 'Utmaning') {
            return 'images/ball.png';
        }

        const collection = achievement.category === 'Poäng'
            ? SCORE_ACHIEVEMENTS
            : achievement.category === 'Streak'
                ? STREAK_ACHIEVEMENTS
                : [];
        const index = collection.findIndex(candidate => candidate.name === achievement.name);

        if (index < 0) return '';

        const prefix = achievement.category === 'Poäng' ? 'level' : 'streak';
        return `images/achievements/${prefix}${index + 1}.png`;
    }

    function formatRulesLabel(rules) {
        const labels = {
            '5v5': '5 mot 5',
            '7v7': '7 mot 7',
            '9v9': '9 mot 9',
            '11v11': '11 mot 11'
        };
        return labels[rules] || rules;
    }

    function isExpertMode() {
        return selectedDifficulty === EXPERT_DIFFICULTY;
    }

    function clearQuestionTimer() {
        if (questionTimerId !== null) {
            clearTimeout(questionTimerId);
            questionTimerId = null;
        }

        if (questionTimerIntervalId !== null) {
            clearInterval(questionTimerIntervalId);
            questionTimerIntervalId = null;
        }
    }

    function updateTimerDisplay(secondsLeft) {
        if (!isExpertMode()) {
            quizTimer.classList.add('hidden');
            quizTimer.classList.remove('is-warning');
            return;
        }

        quizTimer.classList.remove('hidden');
        quizTimer.textContent = `Tid: ${secondsLeft}s`;
        quizTimer.classList.toggle('is-warning', secondsLeft <= 2);
    }

    function renderStrikeStatus() {
        if (!isExpertMode()) {
            quizStrikeStatus.classList.add('hidden');
            quizStrikeStatus.textContent = '';
            return;
        }

        const remainingChances = Math.max(0, MAX_STRIKES - strikes);
        const lastStrike = strikes > 0
            ? ` (${STRIKE_TITLES[Math.min(strikes - 1, STRIKE_TITLES.length - 1)]})`
            : '';
        quizStrikeStatus.classList.remove('hidden');
        quizStrikeStatus.textContent = `Chanser kvar: ${remainingChances}/${MAX_STRIKES}${lastStrike}`;
    }

    function syncRulesSelectionUI() {
        rulesButtons.forEach(button => {
            const rules = button.dataset.rules;
            const isActive = selectedRules.includes(rules);
            button.classList.toggle('active', isActive);
            button.setAttribute('aria-pressed', String(isActive));
        });

        const hasRules = selectedRules.length > 0;
        btnStartQuiz.disabled = !hasRules;
        btnStartQuiz.title = hasRules ? '' : 'Välj minst en spelform för att starta quiz';
        rulesButtonsContainer.classList.toggle('is-empty', !hasRules);

        if (!rulesSelectionHelp) {
            return;
        }

        rulesSelectionHelp.classList.toggle('hidden', hasRules);
        rulesSelectionHelp.textContent = 'Ingen spelform vald. Välj minst en för att kunna starta quiz.';
    }

    function startQuestionTimer() {
        clearQuestionTimer();

        if (!isExpertMode()) {
            return;
        }

        let secondsLeft = EXPERT_TIME_LIMIT_SECONDS;
        updateTimerDisplay(secondsLeft);

        questionTimerIntervalId = setInterval(() => {
            secondsLeft = Math.max(0, secondsLeft - 1);
            updateTimerDisplay(secondsLeft);
        }, 1000);

        questionTimerId = setTimeout(() => {
            handleAnswer(null, { timedOut: true });
        }, EXPERT_TIME_LIMIT_SECONDS * 1000);
    }

    function addStrike() {
        strikes = Math.min(MAX_STRIKES, strikes + 1);
        currentStreak = 0;
        setStoredStreak(CURRENT_STREAK_KEY, currentStreak);
        renderStrikeStatus();

        return {
            strikes,
            title: STRIKE_TITLES[Math.min(strikes - 1, STRIKE_TITLES.length - 1)],
            eliminated: strikes >= MAX_STRIKES
        };
    }

    function shuffleArray(list) {
        const arr = [...list];
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return arr;
    }

    // Välj 4 svarsalternativ, varav ett alltid är rätt
    function pickAnswers(q) {
        const correctAnswer = q.answers[q.correctIndex];
        const others = q.answers.filter((_, i) => i !== q.correctIndex);
        const shuffledOthers = shuffleArray(others).slice(0, 3);
        const combined = shuffleArray([correctAnswer, ...shuffledOthers]);
        return {
            answers: combined,
            correctIndex: combined.indexOf(correctAnswer)
        };
    }

    // Vyhantering
    function showView(targetView) {
        views.forEach(v => v.classList.remove('active'));
        targetView.classList.add('active');

        if (targetView !== viewQuiz) {
            clearQuestionTimer();
            quizTimer.classList.add('hidden');
            quizTimer.classList.remove('is-warning');
            quizStrikeStatus.classList.add('hidden');
        }
    }

    // LocalStorage-hjälpare
    function getTotalScore() {
        const val = localStorage.getItem(TOTAL_SCORE_KEY);
        return val ? Number(val) : 0;
    }

    function setTotalScore(totalScore) {
        localStorage.setItem(TOTAL_SCORE_KEY, String(Math.max(0, Math.floor(totalScore))));
    }

    function addToTotalScore(pointsToAdd) {
        const nextTotalScore = getTotalScore() + Math.max(0, Math.floor(pointsToAdd));
        setTotalScore(nextTotalScore);
        return nextTotalScore;
    }

    function getStoredAchievements() {
        const val = localStorage.getItem(ACHIEVEMENTS_KEY);
        if (!val) return [];
        try {
            const parsed = JSON.parse(val);
            return Array.isArray(parsed) ? parsed : [];
        } catch {
            return [];
        }
    }

    function setStoredAchievements(list) {
        localStorage.setItem(ACHIEVEMENTS_KEY, JSON.stringify(list));
    }

    function getStoredStreak(key) {
        const val = localStorage.getItem(key);
        const parsed = Number(val);
        if (!Number.isFinite(parsed) || parsed < 0) return 0;
        return Math.floor(parsed);
    }

    function setStoredStreak(key, value) {
        const safeValue = Math.max(0, Math.floor(value));
        localStorage.setItem(key, String(safeValue));
    }

    function pickRandomPhrase(phrases) {
        return phrases[Math.floor(Math.random() * phrases.length)];
    }

    function getResultPhrase(correctAnswers, totalQuestions) {
        const total = Math.max(1, totalQuestions);
        const ratio = correctAnswers / total;

        if (ratio < 0.35) {
            return pickRandomPhrase([
                'Plugga reglerna lite till',
                'Ta en snabb regelrepetition och kör igen',
                'Bra försök, men här finns mer att lära'
            ]);
        }
        if (ratio < 0.6) {
            return pickRandomPhrase([
                'Du är på god väg, fortsätt träna',
                'Stabil grund, men du kan vässa detaljerna',
                'Bra jobbat, en till runda så sitter det bättre'
            ]);
        }
        if (ratio < 0.85) {
            return pickRandomPhrase([
                'Riktigt bra jobbat',
                'Snygg nivå, du har bra koll',
                'Mycket stark insats'
            ]);
        }
        if (ratio < 1) {
            return pickRandomPhrase([
                'Grymt jobbat, nästan full pott',
                'Imponerande, du är riktigt nära max',
                'Stark domarform idag'
            ]);
        }
        return pickRandomPhrase([
            'Perfekt runda, full pott',
            'Klockrent, du satte allt',
            'Otroligt, helt felfritt'
        ]);
    }

    function resetAnswerFeedback() {
        quizFeedback.classList.add('hidden');
        quizFeedbackExplanation.textContent = '';
        btnNextQuestion.textContent = 'Nästa fråga';
    }

    function showAnswerFeedback(explanation, isCorrect, prefix = '') {
        quizFeedback.classList.remove('hidden');
        btnNextQuestion.textContent = currentIndex === currentQuestions.length - 1 ? 'Visa resultat' : 'Nästa fråga';
        const statusText = prefix || (isCorrect ? 'Rätt! ' : 'Fel! ');
        const explanationText = explanation && explanation.trim()
            ? explanation.trim()
            : 'Ingen förklaring tillgänglig ännu.';
        quizFeedbackExplanation.textContent = `${statusText}${explanationText}`;
        btnNextQuestion.focus();
    }

    function continueToNextQuestion() {
        clearQuestionTimer();
        resetAnswerFeedback();
        currentIndex++;

        if (currentIndex < currentQuestions.length) {
            renderCurrentQuestion();
            return;
        }

        showResult();
    }

    function resetDebugProgress() {
        roundScore = 0;
        currentStreak = 0;
        maxStreak = 0;
        localStorage.setItem(TOTAL_SCORE_KEY, '0');
        setStoredAchievements([]);
        setStoredStreak(CURRENT_STREAK_KEY, currentStreak);
        setStoredStreak(MAX_STREAK_KEY, maxStreak);
        updateScoreDisplay();
        updateBallPosition();
        renderStartMeta();
    }

    // Achievementlogik
    function checkAchievements(scoreValue, maxStreakValue, roundContext = {}) {
        const existing = getStoredAchievements();
        const updated = [...existing];

        function unlock(name) {
            if (!updated.includes(name)) {
                updated.push(name);
            }
        }

        ALL_ACHIEVEMENTS.forEach(achievement => {
            if (achievement.category === 'Poäng' && scoreValue >= achievement.threshold) {
                unlock(achievement.name);
            }

            if (achievement.category === 'Streak' && maxStreakValue >= achievement.threshold) {
                unlock(achievement.name);
            }
        });

        const isPerfectTen = roundContext.correctAnswers === 10 && roundContext.totalQuestions === 10;
        if (isPerfectTen && roundContext.difficulty) {
            CHALLENGE_ACHIEVEMENTS
                .filter(achievement => achievement.difficulty === roundContext.difficulty)
                .forEach(achievement => unlock(achievement.name));
        }

        const newlyUnlocked = updated.filter(a => !existing.includes(a));
        setStoredAchievements(updated);

        return { all: updated, newlyUnlocked };
    }

    // UI-uppdateringar
    function updateScoreDisplay() {
    }

    function getScoreProgressState() {
        const progressScore = getTotalScore();
        const nextAchievement = SCORE_ACHIEVEMENTS.find(achievement => progressScore < achievement.threshold);

        if (!nextAchievement) {
            const finalAchievement = SCORE_ACHIEVEMENTS[SCORE_ACHIEVEMENTS.length - 1];
            return {
                percent: 100,
                current: progressScore,
                target: finalAchievement.threshold,
                label: `Alla poängframsteg upplåsta: ${finalAchievement.name}`
            };
        }

        const previousThreshold = SCORE_ACHIEVEMENTS
            .filter(achievement => achievement.threshold < nextAchievement.threshold && progressScore >= achievement.threshold)
            .reduce((highestThreshold, achievement) => Math.max(highestThreshold, achievement.threshold), 0);
        const intervalSize = Math.max(1, nextAchievement.threshold - previousThreshold);
        const rawPercent = ((progressScore - previousThreshold) / intervalSize) * 100;

        return {
            percent: Math.max(0, Math.min(100, rawPercent)),
            current: progressScore,
            target: nextAchievement.threshold,
            label: `Nästa framsteg: ${nextAchievement.name}`
        };
    }

    function updateBallPosition() {
        const progressState = getScoreProgressState();
        scoreBall.style.left = `${progressState.percent}%`;
        scoreProgressCurrent.textContent = `${progressState.current} / ${progressState.target} poäng`;
    }

    function renderStartMeta() {
        const storedCurrentStreak = getStoredStreak(CURRENT_STREAK_KEY);
        const storedBestStreak = getStoredStreak(MAX_STREAK_KEY);
        const achievements = getStoredAchievements();
        const unlockedCount = achievements.length;

        currentStreakDisplay.textContent = String(storedCurrentStreak);
        bestStreakDisplay.textContent = String(storedBestStreak);
        achievementSummaryCount.textContent = `${unlockedCount} / ${ALL_ACHIEVEMENTS.length}`;

        if (unlockedCount > 0) {
            achievementSummaryStatus.textContent = 'Tryck för att visa alla framsteg';
            achievementSummary.classList.remove('is-empty');
            achievementSummary.classList.add('is-active');
            achievementSummary.disabled = false;
        } else {
            achievementSummaryStatus.textContent = 'Inga framsteg upplåsta ännu.';
            achievementSummary.classList.remove('is-active');
            achievementSummary.classList.add('is-empty');
            achievementSummary.disabled = true;
        }
    }

    function renderAchievementsModal() {
        const unlockedNames = getStoredAchievements();
        achievementsGrid.innerHTML = '';

        ACHIEVEMENT_CATEGORY_ORDER.forEach(categoryName => {
            const achievementsInCategory = ALL_ACHIEVEMENTS.filter(ach => ach.category === categoryName);
            if (achievementsInCategory.length === 0) {
                return;
            }

            const categorySection = document.createElement('section');
            categorySection.className = 'achievement-category';

            const categoryTitle = document.createElement('h3');
            categoryTitle.className = 'achievement-category-title';
            categoryTitle.textContent = categoryName;

            const categoryGrid = document.createElement('div');
            categoryGrid.className = 'achievement-category-grid';

            achievementsInCategory.forEach(ach => {
                const isUnlocked = unlockedNames.includes(ach.name);
                const item = document.createElement('div');
                item.className = `achievement-item ${isUnlocked ? 'unlocked' : ''}`;

                const nameDiv = document.createElement('div');
                nameDiv.className = 'achievement-name';
                nameDiv.textContent = ach.name;

                const image = document.createElement('img');
                image.className = 'achievement-image';
                image.src = getAchievementImageSrc(ach);
                image.alt = ach.name;

                const criteriaDiv = document.createElement('div');
                criteriaDiv.className = 'achievement-criteria';
                criteriaDiv.textContent = ach.criteria;

                item.appendChild(nameDiv);
                item.appendChild(image);
                item.appendChild(criteriaDiv);
                categoryGrid.appendChild(item);
            });

            categorySection.appendChild(categoryTitle);
            categorySection.appendChild(categoryGrid);
            achievementsGrid.appendChild(categorySection);
        });
    }

    function showAchievementsModal() {
        renderAchievementsModal();
        achievementsModal.classList.remove('hidden');
    }

    function hideAchievementsModal() {
        achievementsModal.classList.add('hidden');
    }

    // Quizflöde
    function startQuiz() {
        if (selectedRules.length === 0) {
            syncRulesSelectionUI();
            return;
        }

        clearQuestionTimer();
        const randomizedRules = shuffleArray(selectedRules);
        const all = [];
        randomizedRules.forEach(rule => {
            QUESTIONS.forEach(q => {
                if (q.rules === rule && q.difficulty === selectedDifficulty) {
                    all.push(q);
                }
            });
        });

        if (all.length === 0) {
            alert('Inga frågor finns för denna kombination ännu.');
            return;
        }

        const shuffledQuestions = shuffleArray(all);
        currentQuestions = shuffledQuestions.slice(0, 10);
        currentIndex = 0;
        correctCount = 0;
        roundScore = 0;
        strikes = 0;
        wasUtvisad = false;
        questionResolved = false;

        renderStrikeStatus();
        updateTimerDisplay(EXPERT_TIME_LIMIT_SECONDS);
        updateScoreDisplay();
        updateBallPosition();
        showView(viewQuiz);
        renderCurrentQuestion();
    }

    function renderCurrentQuestion() {
        clearQuestionTimer();
        questionResolved = false;

        const q = currentQuestions[currentIndex];
        quizProgress.textContent = `Fråga ${currentIndex + 1} av ${currentQuestions.length}`;
        quizQuestionText.textContent = `${formatRulesLabel(q.rules)}: ${q.question}`;
        resetAnswerFeedback();

        if (q.type === 'img' && q.imgUrl) {
            quizQuestionImage.src = q.imgUrl;
            quizQuestionImage.classList.remove('hidden');
        } else {
            quizQuestionImage.classList.add('hidden');
            quizQuestionImage.removeAttribute('src');
        }

        quizAnswers.innerHTML = '';

        const picked = pickAnswers(q);
        pickedAnswers = picked.answers;
        pickedCorrectIndex = picked.correctIndex;

        pickedAnswers.forEach((alt, index) => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.textContent = alt;
            btn.addEventListener('click', () => handleAnswer(index));
            quizAnswers.appendChild(btn);
        });

        if (isExpertMode()) {
            renderStrikeStatus();
            startQuestionTimer();
        } else {
            quizTimer.classList.add('hidden');
            quizStrikeStatus.classList.add('hidden');
        }

    }

    function handleAnswer(selectedIndex, options = {}) {
        if (questionResolved) {
            return;
        }

        questionResolved = true;
        clearQuestionTimer();

        const q = currentQuestions[currentIndex];
        const buttons = quizAnswers.querySelectorAll('button');
        const timedOut = options.timedOut === true;

        buttons.forEach((btn, i) => {
            if (i === pickedCorrectIndex) btn.classList.add('correct');
            if (!timedOut && i === selectedIndex && i !== pickedCorrectIndex) btn.classList.add('wrong');
            btn.disabled = true;
        });

        if (!timedOut && selectedIndex === pickedCorrectIndex) {
            correctCount++;
            currentStreak++;
            if (currentStreak > maxStreak) {
                maxStreak = currentStreak;
            }
            setStoredStreak(CURRENT_STREAK_KEY, currentStreak);
            setStoredStreak(MAX_STREAK_KEY, maxStreak);

            const earnedPoints = Math.round(10 * (difficultyMultiplier[selectedDifficulty] || 1));
            roundScore += earnedPoints;
            addToTotalScore(earnedPoints);
            updateScoreDisplay();
            updateBallPosition();
            showAnswerFeedback(q.explanation, true);
            return;
        }

        if (isExpertMode()) {
            const strikeInfo = addStrike();
            updateScoreDisplay();
            updateBallPosition();

            if (strikeInfo.eliminated) {
                wasUtvisad = true;
                showResult();
                return;
            }

            const strikeText = `${strikeInfo.title}! ${MAX_STRIKES - strikeInfo.strikes} försök kvar.`;
            if (timedOut) {
                showAnswerFeedback(`${strikeText} Tiden tog slut. ${q.explanation || ''}`.trim(), false, 'Timeout! ');
            } else {
                showAnswerFeedback(`${strikeText} ${q.explanation || ''}`.trim(), false, 'Fel! ');
            }
        } else {
            currentStreak = 0;
            setStoredStreak(CURRENT_STREAK_KEY, currentStreak);
            updateScoreDisplay();
            updateBallPosition();
            showAnswerFeedback(q.explanation, false);
        }
    }

    function showResult() {
        updateBallPosition();
        const totalScore = getTotalScore();

        if (isExpertMode() && wasUtvisad) {
            const answered = Math.min(currentQuestions.length, correctCount + strikes);
            resultSummary.textContent = `🟥Utvisning! Du fick ${correctCount} av ${answered} rätt innan domaren visade ut dig från spel.`;
        } else {
            const phrase = getResultPhrase(correctCount, currentQuestions.length);
            resultSummary.textContent = `Du fick ${correctCount} av ${currentQuestions.length} rätt. ${phrase}!`;
        }

        const { newlyUnlocked } = checkAchievements(totalScore, maxStreak, {
            correctAnswers: correctCount,
            totalQuestions: currentQuestions.length,
            difficulty: selectedDifficulty
        });

        if (newlyUnlocked.length > 0) {
            resultAchievementsBlock.classList.remove('hidden');
            resultAchievementsBlock.classList.add('has-new');

            resultAchievementsNew.textContent =
                newlyUnlocked.length === 1
                    ? '1 nytt framsteg upplåst denna omgång!'
                    : `${newlyUnlocked.length} nya framsteg upplåsta denna omgång!`;

            resultAchievementsAll.innerHTML = '';
            newlyUnlocked.forEach(name => {
                const achievement = ALL_ACHIEVEMENTS.find(a => a.name === name);
                const li = document.createElement('li');

                const nameDiv = document.createElement('div');
                nameDiv.className = 'result-achievement-name';
                nameDiv.textContent = achievement ? achievement.name : name;

                const image = document.createElement('img');
                image.className = 'result-achievement-image';
                image.src = getAchievementImageSrc(achievement);
                image.alt = achievement ? achievement.name : name;

                const criteriaDiv = document.createElement('div');
                criteriaDiv.className = 'result-achievement-criteria';
                criteriaDiv.textContent = achievement ? achievement.criteria : '';

                li.appendChild(nameDiv);
                li.appendChild(image);
                li.appendChild(criteriaDiv);
                resultAchievementsAll.appendChild(li);
            });
        } else {
            resultAchievementsBlock.classList.add('hidden');
            resultAchievementsBlock.classList.remove('has-new');
            resultAchievementsNew.textContent = '';
            resultAchievementsAll.innerHTML = '';
        }

        renderStartMeta();
        showView(viewResult);
    }

    // Event-hantering
    rulesButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const rules = btn.dataset.rules;
            if (selectedRules.includes(rules)) {
                selectedRules = selectedRules.filter(r => r !== rules);
            } else {
                selectedRules = [...selectedRules, rules];
            }

            syncRulesSelectionUI();
        });
    });

    diffButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            diffButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            selectedDifficulty = btn.dataset.diff;
        });
    });

    btnStartQuiz.addEventListener('click', () => {
        startQuiz();
    });

    btnRestart.addEventListener('click', () => {
        updateBallPosition();
        showView(viewStart);
    });

    btnNextQuestion.addEventListener('click', () => {
        continueToNextQuestion();
    });

    btnDebugResetProgress.addEventListener('click', () => {
        resetDebugProgress();
    });

    achievementSummary.addEventListener('click', () => {
        if (!achievementSummary.disabled) {
            showAchievementsModal();
        }
    });

    modalClose.addEventListener('click', () => {
        hideAchievementsModal();
    });

    modalOverlay.addEventListener('click', () => {
        hideAchievementsModal();
    });

    // Init
    currentStreak = getStoredStreak(CURRENT_STREAK_KEY);
    maxStreak = getStoredStreak(MAX_STREAK_KEY);
    if (currentStreak > maxStreak) {
        maxStreak = currentStreak;
        setStoredStreak(MAX_STREAK_KEY, maxStreak);
    }

    renderStartMeta();
    syncRulesSelectionUI();
    updateScoreDisplay();
    updateBallPosition();
});