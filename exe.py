import itertools
import kociemba
import random

from magiccube import Cube

# don't use default value, kociemba doesn't care where you have set the centers
# it knows it's centers
# default_start_arrangement = "YYYYYYYYYOOOOOOOOOBBBBBBBBBRRRRRRRRRGGGGGGGGGWWWWWWWWW"
# default_start_arrangement = "WWWWWWWWWOOOOOOOOOGGGGGGGGGRRRRRRRRRBBBBBBBBBYYYYYYYYY"

class RubiksError(Exception):
    """
    Custom exception
    """
    def __init__(self, message, status_code=400):
        super().__init__(message)
        self.status_code = status_code


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
    c = Cube(3, state)
    k_state = c.get_kociemba_facelet_positions()

    solution = kociemba.solve(k_state)
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
            c = Cube(3, candidate)
            k_candidate = c.get_kociemba_facelet_positions()
            kociemba.solve(k_candidate)
            valid_states.append(candidate)
        except:
            continue

        if len(valid_states) >= max_results:
            break

    return {
        "status": "partial",
        "count": len(valid_states),
        "valid_completions": valid_states
    }


def check_cube_state(state):
    if len(state) != 54:
        return {"status": "invalid", "reason": "State must be 54 characters"}

    if is_any_orientation_solved(state):
        return {"status": "solved", "solution": ""}

    # FULL STATE - direct solve
    if "_" not in state:
        try:
            c = Cube(3, state)
            k_state = c.get_kociemba_facelet_positions()
            solution = kociemba.solve(k_state)
            return {"status": "valid", "solution": solution}
        except Exception as e:
            return {"status": "invalid", "reason": str(e)}

    valid_completions = get_valid_completions(state)
    return valid_completions


def random_state(number_of_random_moves=25):
    c = Cube(3)

    # random scramble
    for _ in range(number_of_random_moves):
        move = random.choice(MOVES)
        c.rotate(move)

    state = c.get()
    return state


def apply_move(state, move):
    if move not in MOVES:
        return {"status": "invalid", "reason": "Invalid move"}

    try:
        c = Cube(3, state)
        c.rotate(move)

        new_state = c.get()
        return {"status": "ok", "new_state": new_state}
    except Exception as e:
        return {"status": "error", "reason": str(e)}


def solve(state):
    if len(state) != 54:
        return {"status": "invalid", "reason": "State must be 54 characters"}

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

        solved_state = c.get()

        return {"status": "ok", "state": solved_state, "solution": solution}

    except Exception as e:
        return {"status": "error", "reason": str(e)}
