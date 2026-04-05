# Ref Quiz – Fotbollsregler

Ref Quiz är en webbapp för att träna spelregler i barn- och ungdomsfotboll.
Quizet fokuserar på spelformerna 5v5, 7v7, 9v9 och 11v11, med tre svårighetsgrader.

## Innehåll

- Slumpade quizomgångar med upp till 10 frågor
- Val av en eller flera spelformer
- Svårighetsnivåer: lätt, medel, svår
- Streak-system (nuvarande och bästa streak sparas lokalt)
- Framsteg för poäng och streak
- Bildfrågor via `imgUrl` i frågebanken

## Teknik

- HTML
- CSS
- Vanilla JavaScript
- Frågor laddas från CSV (`js/questions.csv`)
- Progress och framsteg sparas i `localStorage`

## Projektstruktur

```text
ref-quiz/
  index.html
  README.md
  css/
    style.css
  images/
    achievements/
  js/
    app.js
    csv-loader.js
    questions.csv
```

## Frågebank (CSV)

Frågorna ligger i `js/questions.csv` och använder semikolon som avskiljare.

Förväntade kolumner:

- `id`
- `rules` (exempel: `5v5`, `7v7`, `9v9`, `11v11`)
- `difficulty` (`easy`, `medium`, `hard`)
- `type` (`text` eller `img`)
- `question`
- `imgUrl` (kan vara tom för textfrågor)
- `answer1` till `answer5`
- `correctIndex` (index för rätt svar)
- `explanation`

Tips:

- Håll konsekventa namn på `rules` och `difficulty`, annars filtreras frågan bort.
- Om `type` är `img` måste `imgUrl` peka på en giltig bildfil.

## Hur poäng fungerar

- Korrekt svar ger grundpoäng baserat på svårighet.
- Fel svar nollställer nuvarande streak.
- Total poäng används för att låsa upp poängframsteg.

## Data som sparas i webbläsaren

Följande nycklar i `localStorage` används:

- `refquiz_totalScore`
- `refquiz_achievements`
- `refquiz_currentStreak`
- `refquiz_maxStreak`

Debug-knappen i appen kan återställa poäng och streak lokalt.

## Målgrupp

Projektet är framtaget som ett enkelt och motiverande sätt att repetera regler för domare, ledare och spelare inom barn- och ungdomsfotboll.
