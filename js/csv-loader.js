async function loadQuestionsFromCSV(path) {
    const response = await fetch(path);
    const text = await response.text();
    const rows = text.trim().split(/\r?\n/);
    const header = rows.shift().split(";");

    return rows
        .filter(r => r.trim().length > 0)
        .map(row => {
        const cols = parseCSVRow(row);
        const idx = name => header.indexOf(name);

        return {
            id: cols[idx("id")],
            rules: cols[idx("rules")],
            difficulty: cols[idx("difficulty")],
            type: cols[idx("type")],
            question: cols[idx("question")],
            imgUrl: cols[idx("imgUrl")] || null,
            answers: [
                cols[idx("answer1")],
                cols[idx("answer2")],
                cols[idx("answer3")],
                cols[idx("answer4")],
                cols[idx("answer5")]
            ].filter(Boolean),
            correctIndex: Number(cols[idx("correctIndex")]),
            explanation: cols[idx("explanation")] || ""
        };
    });
}

function parseCSVRow(row) {
    const result = [];
    let inQuotes = false;
    let field = "";

    for (let i = 0; i < row.length; i++) {
        const char = row[i];

        if (char === '"') {
            inQuotes = !inQuotes;
            continue;
        }

        if (char === ";" && !inQuotes) {
            result.push(field);
            field = "";
            continue;
        }

        field += char;
    }
    result.push(field);

    return result;
}