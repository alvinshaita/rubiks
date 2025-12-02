from flask import Flask, render_template, request, jsonify
import itertools
import kociemba
import random

from magiccube import Cube

import exe

app = Flask(__name__)

@app.errorhandler(Exception)
def handle_controller_error(err):
    response = jsonify({"error": str(err)})
    return response, err.status_code

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

    response = exe.check_cube_state(state)
    return jsonify(response)


@app.route("/random_state")
def random_state():
    number_of_random_moves = 25
    state = exe.random_state(number_of_random_moves)
    return jsonify({"state": state})


@app.route("/apply_move", methods=["POST"])
def apply_move():
    data = request.json or {}
    state = data.get("state", "")
    move = data.get("move", "")

    if len(state) != 54:
        return jsonify({"status": "invalid", "reason": "State must be 54 characters"}), 400

    response = exe.apply_move(state, move)
    return jsonify(response)


@app.route("/solve", methods=["POST"])
def solve():
    data = request.json or {}
    state = data.get("state", "")

    response = exe.solve(state)
    return jsonify(response)


if __name__ == "__main__":
    app.run(debug=True)
