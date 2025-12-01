from flask import Flask, render_template, request, jsonify
import itertools
import kociemba
import random

from magiccube import Cube

app = Flask(__name__)

# 6 faces in kociemba order
FACES = ["U", "R", "F", "D", "L", "B"]

# Standard cube colors
COLORS = ["W", "G", "R", "B", "O", "Y", "_"]   # "_" = unknown


@app.route("/")
def index():
    return render_template("index.html", faces=FACES, colors=COLORS)

@app.route("/check_state", methods=["POST"])
def check_cube_state():
    state = request.json.get("state", "")

    c = Cube(3, state)
    k_state = c.get_kociemba_facelet_positions()

    if len(k_state) != 54:
        return jsonify({"status": "invalid", "reason": "State must be 54 characters"}), 400

    if is_any_orientation_solved(k_state):
        return jsonify({"status": "solved", "solution": ""})

    unknown_positions = [i for i, c in enumerate(k_state) if c == "_"]

    # FULL STATE - direct solve
    if "_" not in k_state:
        try:
            solution = kociemba.solve(k_state)
            return jsonify({"status": "valid", "solution": solution})
        except Exception as e:
            return jsonify({"status": "invalid", "reason": str(e)})

    # TODO: PARTIAL STATE - generate completions
    COLORS = ["W", "G", "R", "B", "O", "Y"]
    known_colors = [c for c in k_state if c != "_"]
    count = {c: known_colors.count(c) for c in COLORS}

    # Build missing pool
    missing = []
    for col in COLORS:
        needed = 9 - count[col]
        if needed < 0:
            return jsonify({"status": "invalid", "reason": f"Too many {col} stickers"})
        missing += [col] * needed

    if len(missing) != len(unknown_positions):
        return jsonify({"status": "invalid", "reason": "Color counts incorrect"})

    import itertools
    valid_states = []
    max_results = 200

    for perm in set(itertools.permutations(missing)):
        temp = list(k_state)

        for pos, col in zip(unknown_positions, perm):
            temp[pos] = col

        candidate = "".join(temp)

        try:
            kociemba.solve(candidate)
            valid_states.append(candidate)
        except:
            continue

        if len(valid_states) >= max_results:
            break

    return jsonify({
        "status": "partial",
        "count": len(valid_states),
        "valid_completions": valid_states
    })

@app.route("/random_state")
def random_state():
    c = Cube(3)
    number_of_random_moves = 25
    # random scramble
    moves = ["U","U'","U2","R","R'","R2","F","F'","F2","D","D'","D2","L","L'","L2","B","B'","B2"]
    scramble = " ".join(random.choice(moves) for _ in range(number_of_random_moves))
    c.rotate(scramble)

    state = c.get()
    return jsonify({"state": state})


@app.route("/apply_move", methods=["POST"])
def apply_move():
    data = request.json or {}
    state = data.get("state", "")
    move = data.get("move", "")

    if len(state) != 54:
        return jsonify({"status": "invalid", "reason": "State must be 54 characters"}), 400

    if move not in ["U","U'","U2","D","D'","D2",
                    "L","L'","L2","R","R'","R2",
                    "F","F'","F2","B","B'","B2"]:
        return jsonify({"status": "invalid", "reason": "Invalid move"}), 400

    try:
        c = Cube(3, state)
        c.rotate(move)

        new_state = c.get()

        return jsonify({
            "status": "ok",
            "new_state": new_state
        })

    except Exception as e:
        return jsonify({"status": "error", "reason": str(e)}), 500


def is_any_orientation_solved(state: str) -> bool:
    """
    The cube is solved in any orientation if each face has 9 identical stickers.
    Orientation of the whole cube does not matter.
    """
    if len(state) != 54:
        return False

    faces = [state[i*9:(i+1)*9] for i in range(6)]

    for face in faces:
        if len(set(face)) != 1:  # face must all be the same color
            return False

    return True

if __name__ == "__main__":
    app.run(debug=True)
