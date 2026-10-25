// ---------- Element references ----------
const expressionEl = document.getElementById("expression");
const resultEl = document.getElementById("result");
const keys = document.querySelector(".keys");

// ---------- Calculator state ----------
let expression = "";        // what the user typed, e.g. "12+3*4"
let justEvaluated = false;  // true right after pressing "="
let historyText = "";       // e.g. "12 + 3 ×  4 ="
let resultText = "";        // final answer shown after "="
let errorMessage = "";      // e.g. "Can't divide by 0"


// ---------- Small helpers ----------
function isOperator(char) {
    return "+-*/".includes(char);
}

// Last number being typed, e.g. "12+3.5" -> "3.5"
function getLastNumber(text) {
    return text.match(/\d*\.?\d*$/)[0];
}

// Remove operators at the end, e.g. "5+3*" -> "5+3"
function stripTrailingOperators(text) {
    return text.replace(/[+\-*/]+$/, "");
}

function hasOperator(text) {
    return /[\d.][+\-*/]/.test(text);
}

// Show nice symbols to the user
function prettify(text) {
    return text
        .replace(/(?<=[\d.])([+\-*/])/g, " $1 ")
        .replace(/\*/g, "×")
        .replace(/\//g, "÷")
        .replace(/-/g, "−");
}

// Fix floating point problems (0.1 + 0.2 = 0.30000000000000004)
function roundNumber(value) {
    return parseFloat(value.toPrecision(12));
}

function formatResult(value) {
    const rounded = roundNumber(value);
    const size = Math.abs(rounded);

    if (size >= 1e15 || (size > 0 && size < 1e-6)) {
        return rounded.toExponential(6).replace(/\.?0+e/, "e");
    }
    return String(rounded);
}


// ---------- Calculation (no eval, safe) ----------
// Returns a number, null for divide by zero, or NaN for an invalid expression
function evaluate(text) {
    const tokens = [];
    let i = 0;

    // 1. Split into numbers and operators
    while (i < text.length) {
        const char = text[i];
        const previous = tokens[tokens.length - 1];
        const afterOperator = previous === undefined || typeof previous === "string";

        // A minus sign at the start or after an operator means a negative number
        const isNegativeSign = char === "-" && afterOperator;

        if (isNegativeSign || /[\d.]/.test(char)) {
            let numberText = "";
            if (isNegativeSign) {
                numberText = "-";
                i++;
            }
            let digits = "";
            while (i < text.length && /[\d.]/.test(text[i])) {
                digits += text[i];
                i++;
            }
            const number = parseFloat(digits);
            if (isNaN(number)) return NaN;
            tokens.push(numberText === "-" ? -number : number);
        } else if (isOperator(char)) {
            tokens.push(char);
            i++;
        } else {
            return NaN;
        }
    }

    // 2. Check pattern: number operator number operator number ...
    if (tokens.length % 2 === 0) return NaN;
    for (let k = 0; k < tokens.length; k++) {
        const shouldBeNumber = k % 2 === 0;
        if (shouldBeNumber && typeof tokens[k] !== "number") return NaN;
        if (!shouldBeNumber && typeof tokens[k] !== "string") return NaN;
    }

    // 3. First pass: × and ÷ (they come before + and −)
    const stack = [tokens[0]];
    for (let k = 1; k < tokens.length; k += 2) {
        const operator = tokens[k];
        const number = tokens[k + 1];

        if (operator === "*") {
            stack.push(stack.pop() * number);
        } else if (operator === "/") {
            if (number === 0) return null;
            stack.push(stack.pop() / number);
        } else {
            stack.push(operator, number);
        }
    }

    // 4. Second pass: + and −
    let total = stack[0];
    for (let m = 1; m < stack.length; m += 2) {
        total = stack[m] === "+" ? total + stack[m + 1] : total - stack[m + 1];
    }

    return total;
}


// ---------- Display ----------
function render() {
    // Top line: what the user typed (or the finished sum)
    expressionEl.textContent = justEvaluated ? historyText : prettify(expression);
    expressionEl.scrollLeft = expressionEl.scrollWidth;

    // Big line: final answer, error, or a live result while typing
    let main;

    if (errorMessage) {
        main = errorMessage;
    } else if (justEvaluated) {
        main = resultText;
    } else {
        const cleaned = stripTrailingOperators(expression);

        if (hasOperator(cleaned)) {
            const liveValue = evaluate(cleaned);
            if (typeof liveValue === "number" && isFinite(liveValue)) {
                main = formatResult(liveValue);
            } else {
                main = getLastNumber(cleaned) || "0";
            }
        } else {
            main = cleaned === "" ? "0" : cleaned;
        }
    }

    resultEl.textContent = main.replace(/-/g, "−");

    // Make long numbers smaller so they fit
    resultEl.classList.toggle("error", errorMessage !== "");
    resultEl.classList.toggle("small", main.length > 10 && main.length <= 14);
    resultEl.classList.toggle("tiny", main.length > 14 && !errorMessage);

    // Highlight the operator that was just pressed
    document.querySelectorAll(".key.operator").forEach((button) => {
        const last = expression.slice(-1);
        const selected = !justEvaluated && isOperator(last) && button.dataset.value === last;
        button.classList.toggle("selected", selected);
    });
}


// ---------- Actions ----------
function addNumber(digit) {
    if (justEvaluated) {
        expression = "";
        justEvaluated = false;
    }

    const current = getLastNumber(expression);

    if (current === "0" && digit === "0") return;        // no 000
    if (current === "0") {                                // 05 -> 5
        expression = expression.slice(0, -1) + digit;
        return;
    }
    if (current.length >= 15) return;                     // max digits

    expression += digit;
}

function addDecimal() {
    if (justEvaluated) {
        expression = "";
        justEvaluated = false;
    }

    const current = getLastNumber(expression);

    if (current.includes(".")) return;                    // only one dot per number
    expression += current === "" ? "0." : ".";
}

function addOperator(operator) {
    justEvaluated = false;                                // continue from the result

    // Nothing typed yet: only a minus sign (negative number) is allowed
    if (expression === "") {
        if (operator === "-") expression = "-";
        return;
    }
    if (expression === "-") return;

    const last = expression.slice(-1);

    if (isOperator(last)) {
        // Allow 5 × -3
        if (operator === "-" && (last === "*" || last === "/")) {
            expression += operator;
            return;
        }
        // Otherwise replace the old operator: 5 + then × becomes 5 ×
        expression = stripTrailingOperators(expression) + operator;
        return;
    }

    expression += operator;
}

function addPercent() {
    const current = getLastNumber(expression);
    if (current === "" || current === ".") return;

    const percent = roundNumber(parseFloat(current) / 100);
    const plain = percent.toFixed(10).replace(/\.?0+$/, "");

    expression = expression.slice(0, expression.length - current.length) + plain;
    justEvaluated = false;
}

function deleteLast() {
    if (justEvaluated) {
        clearAll();
        return;
    }
    expression = expression.slice(0, -1);
}

function clearAll() {
    expression = "";
    justEvaluated = false;
    historyText = "";
    resultText = "";
    errorMessage = "";
}

function calculate() {
    const cleaned = stripTrailingOperators(expression);

    // Need at least: number operator number
    if (!hasOperator(cleaned)) return;

    const value = evaluate(cleaned);

    if (value === null) {
        errorMessage = "Can't divide by 0";
        expression = "";
        return;
    }
    if (typeof value !== "number" || !isFinite(value)) {
        errorMessage = "Error";
        expression = "";
        return;
    }

    resultText = formatResult(value);
    historyText = prettify(cleaned) + " =";
    justEvaluated = true;

    // Keep the answer so the user can continue calculating with it
    expression = /^-?\d+(\.\d+)?$/.test(resultText) ? resultText : "";
}

// One place that handles every button and key
function handleAction(action, value) {
    errorMessage = "";

    switch (action) {
        case "number":   addNumber(value); break;
        case "decimal":  addDecimal(); break;
        case "operator": addOperator(value); break;
        case "percent":  addPercent(); break;
        case "delete":   deleteLast(); break;
        case "clear":    clearAll(); break;
        case "equals":   calculate(); break;
    }

    render();
}


// ---------- Mouse / touch ----------
keys.addEventListener("click", (event) => {
    const button = event.target.closest(".key");
    if (!button) return;

    handleAction(button.dataset.action, button.dataset.value);
});


// ---------- Keyboard support ----------
function findButton(action, value) {
    const valueRule = value ? `[data-value="${value}"]` : "";
    return document.querySelector(`.key[data-action="${action}"]${valueRule}`);
}

function flashButton(button) {
    if (!button) return;
    button.classList.add("pressed");
    setTimeout(() => button.classList.remove("pressed"), 120);
}

document.addEventListener("keydown", (event) => {
    if (event.ctrlKey || event.metaKey || event.altKey) return;

    const key = event.key;
    let action = null;
    let value = null;

    if (/^\d$/.test(key)) {
        action = "number";
        value = key;
    } else if (["+", "-", "*", "/"].includes(key)) {
        action = "operator";
        value = key;
    } else if (key === "x" || key === "X") {
        action = "operator";
        value = "*";
    } else if (key === "." || key === ",") {
        action = "decimal";
    } else if (key === "%") {
        action = "percent";
    } else if (key === "Enter" || key === "=") {
        action = "equals";
    } else if (key === "Backspace") {
        action = "delete";
    } else if (key === "Escape" || key === "Delete" || key === "c" || key === "C") {
        action = "clear";
    }

    if (!action) return;

    // Stops "/" quick-find and Enter re-clicking a focused button
    event.preventDefault();

    flashButton(findButton(action, value));
    handleAction(action, value);
});


// ---------- Start ----------
render();
