import itertools
import math
import random

from cube.solver import utils
from cube import Cube

DEFAULT_STATE = "YYYYYYYYYBBBBBBBBBRRRRRRRRRGGGGGGGGGOOOOOOOOOWWWWWWWWW"
COMPLETE_COLORS = ["W", "G", "R", "B", "O", "Y"]
MOVES = ["U","U'","U2","R","R'","R2","F","F'","F2","D","D'","D2","L","L'","L2","B","B'","B2"]

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


def get_solution(state):
    """
    Get solution from a cube state
    """
    moves = utils.solve(state, 'Kociemba')
    solution = " ".join([str(move) for move in moves])

    return solution


def get_valid_completions(state):
    """
    Finds all possible states for a cube with a partial state
    """
    unknown_positions = [i for i, c in enumerate(state) if c == "_"]
    # PARTIAL STATE - generate completions
    known_colors = [c for c in state if c != "_"]
    count = {c: known_colors.count(c) for c in COMPLETE_COLORS}

    # Build missing pool
    missing = []
    for col in COMPLETE_COLORS:
        needed = 9 - count[col]
        if needed < 0:
            return {"status": "invalid", "reason": f"Too many {col} stickers"}
        missing += [col] * needed

    if len(missing) != len(unknown_positions):
        return {"status": "invalid", "reason": "Color counts incorrect"}

    valid_states = []
    max_results = 200

    for perm in set(itertools.permutations(missing)):
        temp = list(state)

        for pos, col in zip(unknown_positions, perm):
            temp[pos] = col

        candidate = "".join(temp)

        try:
            utils.solve(candidate, 'Kociemba')
            # utils.solve(candidate, 'Beginner')
            valid_states.append(candidate)
        except:
            # if it can't be solved, it's not a valid state
            continue

        if len(valid_states) >= max_results:
            break

    return {
        "status": "partial",
        "count": len(valid_states),
        "valid_completions": valid_states
    }


def check_cube_state(state):
    cube_size = get_cube_size(state)

    if not cube_size.is_integer():
        return {"status": "invalid", "reason": "State is not valid"}
    cube_size = int(cube_size)

    if is_any_orientation_solved(state):
        return {"status": "solved", "solution": ""}

    # FULL STATE - direct solve
    if "_" not in state:
        try:
            moves = utils.solve(state, 'Kociemba')
            solution = " ".join([str(move) for move in moves])

            return {"status": "valid", "solution": solution}
        except Exception as e:
            raise Exception(str(e))

    valid_completions = get_valid_completions(state)
    return valid_completions


def random_state(number_of_random_moves=25):
    c = Cube(3, DEFAULT_STATE)

    # random scramble
    for _ in range(number_of_random_moves):
        move = random.choice(MOVES)
        c.rotate(move)

    state = c.state.upper()
    return state


def apply_move(state, move):
    cube_size = get_cube_size(state)

    if not cube_size.is_integer():
        return {"status": "invalid", "reason": "State is not valid"}
    cube_size = int(cube_size)

    if move not in MOVES:
        return {"status": "invalid", "reason": "Invalid move"}

    try:
        c = Cube(cube_size, state)
        c.rotate(move)
        new_state = c.state.upper()
        return {"status": "ok", "new_state": new_state}
    except Exception as e:
        return {"status": "error", "reason": str(e)}


def solve(state):
    cube_size = get_cube_size(state)

    if not cube_size.is_integer():
        return {"status": "invalid", "reason": "State is not valid"}
    cube_size = int(cube_size)

    if "_" in state:
        return {"status": "invalid", "reason": "All colors should be filled"}

    if is_any_orientation_solved(state):
        return {"status": "ok", "solution": "", "state": state}
    
    try:
        solution = get_solution(state)

        c = Cube(3, state)
        moves = solution.split(" ")
        for move in moves:
            c.rotate(move)

        solved_state = c.state.upper()

        return {
            "status": "ok",
            "state": solved_state,
            "problem_state": state,
            "solution": solution
        }

    except Exception as e:
        return {"status": "error", "reason": str(e)}


def get_cube_size(state):
    state_length = len(state)
    face_length = state_length / 6
    cube_size = math.sqrt(face_length)
    return cube_size
