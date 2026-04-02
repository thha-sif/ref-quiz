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
    const diffButtons = document.querySelectorAll('.btn-diff');
    const btnStartQuiz = document.getElementById('btn-start-quiz');
    const btnRestart = document.getElementById('btn-restart');
    const btnDebugResetProgress = document.getElementById('btn-debug-reset-progress');

    const quizProgress = document.getElementById('quiz-progress');
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
    let questionStartTime = 0;
    let currentStreak = 0;
    let maxStreak = 0;
    let pickedAnswers = [];
    let pickedCorrectIndex = 0;

    const difficultyMultiplier = {
        'easy': 1,
        'medium': 1.5,
        'hard': 2
    };

    const TOTAL_SCORE_KEY = 'refquiz_totalScore';
    const ACHIEVEMENTS_KEY = 'refquiz_achievements';
    const CURRENT_STREAK_KEY = 'refquiz_currentStreak';
    const MAX_STREAK_KEY = 'refquiz_maxStreak';

    const ALL_ACHIEVEMENTS = [
        { name: 'Nybörjardomare 👶', criteria: 'Uppnå 100 poäng', category: 'Poäng', threshold: 100 },
        { name: 'Diplomerad domare ✅', criteria: 'Uppnå 250 poäng', category: 'Poäng', threshold: 250 },
        { name: 'Erfaren domare ⬆️', criteria: 'Uppnå 500 poäng', category: 'Poäng', threshold: 500 },
        { name: 'Linjedomare 🚩', criteria: 'Uppnå 750 poäng', category: 'Poäng', threshold: 750 },
        { name: 'Assisterande domare 🤝', criteria: 'Uppnå 1000 poäng', category: 'Poäng', threshold: 1000 },
        { name: 'Huvuddomare 🧑‍⚖️', criteria: 'Uppnå 1500 poäng', category: 'Poäng', threshold: 1500 },
        { name: 'UEFA-domare 🌍', criteria: 'Uppnå 2500 poäng', category: 'Poäng', threshold: 2500 },
        { name: 'FIFA-domare 🏆', criteria: 'Uppnå 5000 poäng', category: 'Poäng', threshold: 5000 },
        { name: 'Stabil 🛡️', criteria: 'Uppnå 10 i streak', category: 'Streak', threshold: 10 },
        { name: 'Pålitlig ⚖️', criteria: 'Uppnå 25 i streak', category: 'Streak', threshold: 25 },
        { name: 'Ofelbar 🧠', criteria: 'Uppnå 50 i streak', category: 'Streak', threshold: 50 },
        { name: 'Legendarisk 👑', criteria: 'Uppnå 100 i streak', category: 'Streak', threshold: 100 }
    ];
    const SCORE_ACHIEVEMENTS = ALL_ACHIEVEMENTS
        .filter(achievement => achievement.category === 'Poäng')
        .sort((firstAchievement, secondAchievement) => firstAchievement.threshold - secondAchievement.threshold);

    function formatRulesLabel(rules) {
        const labels = {
            '5v5': '5 mot 5',
            '7v7': '7 mot 7',
            '9v9': '9 mot 9',
            '11v11': '11 mot 11'
        };
        return labels[rules] || rules;
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

    function showAnswerFeedback(explanation, isCorrect) {
        quizFeedback.classList.remove('hidden');
        btnNextQuestion.textContent = currentIndex === currentQuestions.length - 1 ? 'Visa resultat' : 'Nästa fråga';
        const statusText = isCorrect ? 'Rätt! ' : 'Fel! ';
        const explanationText = explanation && explanation.trim()
            ? explanation.trim()
            : 'Ingen förklaring tillgänglig ännu.';
        quizFeedbackExplanation.textContent = `${statusText}${explanationText}`;
        btnNextQuestion.focus();
    }

    function continueToNextQuestion() {
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
    function checkAchievements(scoreValue, maxStreakValue) {
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

        ['Poäng', 'Streak'].forEach(categoryName => {
            const categorySection = document.createElement('section');
            categorySection.className = 'achievement-category';

            const categoryTitle = document.createElement('h3');
            categoryTitle.className = 'achievement-category-title';
            categoryTitle.textContent = categoryName;

            const categoryGrid = document.createElement('div');
            categoryGrid.className = 'achievement-category-grid';

            ALL_ACHIEVEMENTS.filter(ach => ach.category === categoryName).forEach(ach => {
                const isUnlocked = unlockedNames.includes(ach.name);
                const item = document.createElement('div');
                item.className = `achievement-item ${isUnlocked ? 'unlocked' : ''}`;

                const nameDiv = document.createElement('div');
                nameDiv.className = 'achievement-name';
                nameDiv.textContent = ach.name;

                const lockDiv = document.createElement('div');
                lockDiv.className = 'achievement-lock';
                lockDiv.textContent = isUnlocked ? '✓ Upplåst' : '🔒 Låst';

                const criteriaDiv = document.createElement('div');
                criteriaDiv.className = 'achievement-criteria';
                criteriaDiv.textContent = ach.criteria;

                item.appendChild(nameDiv);
                item.appendChild(lockDiv);
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

        updateScoreDisplay();
        updateBallPosition();
        showView(viewQuiz);
        renderCurrentQuestion();
    }

    function renderCurrentQuestion() {
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

        questionStartTime = Date.now();
    }

    function handleAnswer(selectedIndex) {
        const q = currentQuestions[currentIndex];
        const buttons = quizAnswers.querySelectorAll('button');
        const timeTakenSec = (Date.now() - questionStartTime) / 1000;

        buttons.forEach((btn, i) => {
            if (i === pickedCorrectIndex) btn.classList.add('correct');
            if (i === selectedIndex && i !== pickedCorrectIndex) btn.classList.add('wrong');
            btn.disabled = true;
        });

        if (selectedIndex === pickedCorrectIndex) {
            correctCount++;
            currentStreak++;
            if (currentStreak > maxStreak) {
                maxStreak = currentStreak;
            }
            setStoredStreak(CURRENT_STREAK_KEY, currentStreak);
            setStoredStreak(MAX_STREAK_KEY, maxStreak);

            let base = 10 * (difficultyMultiplier[selectedDifficulty] || 1);
            if (timeTakenSec <= 5) base += 5;
            const earnedPoints = Math.round(base);
            roundScore += earnedPoints;
            addToTotalScore(earnedPoints);
        } else {
            currentStreak = 0;
            setStoredStreak(CURRENT_STREAK_KEY, currentStreak);
        }

        updateScoreDisplay();
        updateBallPosition();
        showAnswerFeedback(q.explanation, selectedIndex === pickedCorrectIndex);
    }

    function showResult() {
        updateBallPosition();
        const totalScore = getTotalScore();

        const phrase = getResultPhrase(correctCount, currentQuestions.length);
        resultSummary.textContent = `Du fick ${correctCount} av ${currentQuestions.length} rätt. ${phrase}!`;

        const { newlyUnlocked } = checkAchievements(totalScore, maxStreak);

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
                li.textContent = achievement ? `${name} — ${achievement.criteria}` : name;
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
                if (selectedRules.length === 1) return;
                selectedRules = selectedRules.filter(r => r !== rules);
                btn.classList.remove('active');
            } else {
                selectedRules = [...selectedRules, rules];
                btn.classList.add('active');
            }
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
    updateScoreDisplay();
    updateBallPosition();
});