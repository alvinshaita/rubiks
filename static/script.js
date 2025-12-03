const colorClass = {
    "W": "color-U",
    "R": "color-R",
    "G": "color-F",
    "Y": "color-D",
    "O": "color-L",
    "B": "color-B",
    "_": "color-_"
};

let history = [];
const tilesPerFace = N*N;
const faceOrder = ["U", "L", "F", "R", "B", "D"];
const colors = ["W", "O", "G", "R", "B", "Y", "_"];  // order to cycle through

const defaultState = generateRubiksState(N);

// Generate tiles for each face
for (let face of faceOrder) {
    const faceDiv = document.getElementById(face);
    for (let i = 0; i < N; i++) {
        const tileLine = document.createElement("div");
        tileLine.classList.add("tileLine");

        for (let j = 0; j < N; j++) {
            const tile = document.createElement("div");
            // tile.innerText = "kk"
            tile.classList.add("tile");

            // click to cycle color
            tile.addEventListener("click", () => {
                let current = colors.indexOf(tile.dataset.color || "_");
                current = (current + 1) % colors.length;
                tile.dataset.color = colors[current];
                tile.className = "tile " + colorClass[colors[current]];
                updateInputFromTiles();
                // clear history when tiles are manually changed
                history = []; 
                updateMoveHistoryDisplay(); 
            });

            tileLine.appendChild(tile);
        }

        faceDiv.appendChild(tileLine);
    }
}

const faceDivs = document.getElementsByClassName("face-fill");
for (let faceDiv of faceDivs) {
    for (let i = 0; i < N; i++) {
        const tileLine = document.createElement("div");
        tileLine.classList.add("tileLine");
        for (let j = 0; j < N; j++) {
            const tile = document.createElement("div");
            tile.classList.add("tile-fill");
            tileLine.appendChild(tile);
        }
        faceDiv.appendChild(tileLine);
    }
}


function generateRubiksState(n) {
    var result = "";
    for (let i = 0; i < 6; i++) {
        result += colors[i].repeat(n * n);
    }
    return result;
}


function updateMoveHistoryDisplay() {
    // add forward slash for every 10 moves
    let formattedHistory = "";
    for (let i = 0; i < history.length; i++) {
        formattedHistory += history[i] + " ";
        if ((i + 1) % 10 === 0) {
            formattedHistory += "/ ";
        }
    }
    document.getElementById("move-history").textContent = formattedHistory.trim();
}


// apply cube state string to tiles
function applyCubeState(state) {
    if(state.length !== 6*N*N) {
        alert(`State must be ${6*N*N} characters!`, state.length);
        return;
    }
    let index = 0;
    for(let face of faceOrder) {
        const tiles = document.querySelectorAll(`#${face} .tile`);
        tiles.forEach(tile => {
            const char = state[index];
            tile.dataset.color = char;
            tile.className = "tile " + (colorClass[char] || "color-_");
            index++;
        });
    }
}


// update input field based on current tile colors
function updateInputFromTiles() {
    let state = "";
    for (let face of faceOrder) {
        const tiles = document.querySelectorAll(`#${face} .tile`);
        tiles.forEach(tile => {
            state += tile.dataset.color || "_";
        });
    }

    reset3DCube();
    initializeCubieColors(state);

    document.getElementById("stateInput").value = state;
}


function loadState() {
    const state = document.getElementById("stateInput").value.trim().toUpperCase();
    applyCubeState(state);

    reset3DCube()
    initializeCubieColors(state);

    // clear history when a new state is loaded from the input box
    resetHistory()
}


function resetCube() {
    applyCubeState(defaultState);
    document.getElementById("stateInput").value = defaultState;

    reset3DCube()
    initializeCubieColors(defaultState);

    // clear history on reset
    resetHistory()
}


function checkCube() {
    const state = document.getElementById("stateInput").value.trim().toUpperCase();
    if(state.length !== 54) {
        alert("Cube state must be 54 characters!");
        return;
    }
    fetch("/check_state", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({state})
    })
    .then(res => res.json())
    .then(out => {
        document.getElementById("solution-output").textContent = JSON.stringify(out, null, 2);
    });
}


// random valid state
function randomState() {
    fetch("/random_state")
        .then(res => res.json())
        .then(data => {
            const state = data.state;
            document.getElementById("stateInput").value = state;
            applyCubeState(state);

            reset3DCube()
            initializeCubieColors(state);

            // clear history when a random state is generated
            resetHistory()
        });
}


function sendMove(move) {
    const state = document.getElementById("stateInput").value.trim();

    fetch("/apply_move", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({ state, move })
    })
    .then(res => res.json())
    .then(data => {
        if (data.status !== "ok") {
            alert("Move failed: " + (data.reason || "Unknown error"));
            return;
        }

        const newState = data.new_state;

        history.push(move); 
        updateMoveHistoryDisplay();

        // update UI
        document.getElementById("stateInput").value = newState;
        applyCubeState(newState);

        document.getElementById("output").textContent =
            "Applied move: " + move + "\n\n" +
            JSON.stringify(data, null, 2);


        applyMove(move, newState)
    })
    .catch(err => alert("Error: " + err));
}


function solve() {
    const state = document.getElementById("stateInput").value.trim();

    fetch("/solve", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({ state })
    })
    .then(res => res.json())
    .then(async data => {
        console.log(data)
        if (data.status !== "ok") {
            alert("Solve failed: " + (data.reason || "Unknown error"));
            return;
        }

        // solved state
        const state = data.state;
        const solution = data.solution;

        // update UI
        document.getElementById("stateInput").value = state;
        applyCubeState(state);

        document.getElementById("output").textContent =
            "Solved state: " + "\n\n" +
            JSON.stringify(data, null, 2);

        const moves = solution.split(" ")
        for (const move of moves) {
            history.push(move); 
            updateMoveHistoryDisplay();

            await delay(300);
            applyMove(move, state)
        }
    })
    .catch(err => alert("Error: " + err));
}


// clear moves history
function resetHistory() {
    history = []; 
    updateMoveHistoryDisplay(); 
}


// sleep function
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Initialize
applyCubeState(defaultState);
init3DCube();
// initialize the colors based on the default state
initializeCubieColors(defaultState);
