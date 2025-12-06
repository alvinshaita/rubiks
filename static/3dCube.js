const N = 3;
const HALF = (N - 1) / 2;
let scene, camera, renderer, controls;
const cubies = [];

const colorMap = {
    "W":0xffffff, "R":0xff0000, "G":0x00ff00, "Y":0xffff00,
    "O":0xffa500, "B":0x0000ff, "_":0x111111
};

const CUBIE_SIZE = 1;
const GAP_SIZE = 0.05;

// map face - axis + coordinate for ANY NxN
const faceAxis = {
    'U': { axis: 'y', coord: HALF },
    'D': { axis: 'y', coord: -HALF },
    'R': { axis: 'x', coord: HALF },
    'L': { axis: 'x', coord: -HALF },
    'F': { axis: 'z', coord: HALF },
    'B': { axis: 'z', coord: -HALF }
};

const faceStateMap = {
    'U': {start: 0},
    'L': {start: N*N},
    'F': {start: 2*N*N},
    'R': {start: 3*N*N},
    'B': {start: 4*N*N},
    'D': {start: 5*N*N}
};
for (let f in faceStateMap) {
    faceStateMap[f].end = faceStateMap[f].start + N*N - 1;
}

function getFaceletIndex(face, row, col) {
    return faceStateMap[face].start + row * N + col;
}

function init3DCube(){
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(45,1,0.1,1000);
    camera.position.set(N*1.5, N*1.5, N*2);
    renderer = new THREE.WebGLRenderer({antialias:true});
    renderer.setSize(N*120,N*120);
    document.getElementById("cube3d").appendChild(renderer.domElement);

    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;

    scene.add(new THREE.AmbientLight(0xffffff, 0.8));
    const dl = new THREE.DirectionalLight(0xffffff, 0.5);
    dl.position.set(10,10,10);
    scene.add(dl);

    const geometry = new THREE.BoxGeometry(
        CUBIE_SIZE - GAP_SIZE,
        CUBIE_SIZE - GAP_SIZE,
        CUBIE_SIZE - GAP_SIZE
    );

    // create NxNxN cubies
    for (let x = -HALF; x <= HALF; x++) {
        for (let y = -HALF; y <= HALF; y++) {
            for (let z = -HALF; z <= HALF; z++) {

                const materials = [];
                for (let i = 0; i < 6; i++)
                    materials.push(new THREE.MeshPhongMaterial({color:0x111111}));

                const cube = new THREE.Mesh(geometry, materials);
                cube.position.set(x, y, z);

                cube.userData.coords = {x, y, z};
                cubies.push(cube);
                scene.add(cube);
            }
        }
    }

    animate3D();
}

function reset3DCube() {
    cubies.forEach(c => {
        const {x,y,z} = c.userData.coords;
        c.position.set(x,y,z);
        c.rotation.set(0,0,0);
    });
}

function animate3D(){
    requestAnimationFrame(animate3D);
    controls.update();
    renderer.render(scene,camera);
}


function initializeCubieColors(state) {
    if (state.length !== 6 * N * N) return;

    cubies.forEach(cube => {
        const { x, y, z } = cube.userData.coords;

        // reset all materials
        for (let i = 0; i < 6; i++)
            cube.material[i].color.set(0x111111);

        // face mappings
        // FRONT (+Z) - material[4]
        if (z === HALF) {
            let row = HALF - y;
            let col = x + HALF;
            cube.material[4].color.set(
                colorMap[state[getFaceletIndex("F", row, col)]]
            );
        }

        // BACK (-Z) - material[5]
        if (z === -HALF) {
            let row = HALF - y;
            let col = HALF - x;
            cube.material[5].color.set(
                colorMap[state[getFaceletIndex("B", row, col)]]
            );
        }

        // RIGHT (+X) - material[0]
        if (x === HALF) {
            let row = HALF - y;
            let col = HALF - z;
            cube.material[0].color.set(
                colorMap[state[getFaceletIndex("R", row, col)]]
            );
        }

        // LEFT (-X) - material[1]
        if (x === -HALF) {
            let row = HALF - y;
            let col = z + HALF;
            cube.material[1].color.set(
                colorMap[state[getFaceletIndex("L", row, col)]]
            );
        }

        // UP (+Y) - material[2]
        if (y === HALF) {
            let row = z + HALF;
            let col = x + HALF;
            cube.material[2].color.set(
                colorMap[state[getFaceletIndex("U", row, col)]]
            );
        }

        // DOWN (-Y) - material[3]
        if (y === -HALF) {
            let row = HALF - z;
            let col = x + HALF;
            cube.material[3].color.set(
                colorMap[state[getFaceletIndex("D", row, col)]]
            );
        }
    });
}

function initializeAllCubieColors(state) {
    if (state.length !== 6 * N * N) return;

    cubies.forEach(cube => {
        const { x, y, z } = cube.userData.coords;

        // reset all materials
        for (let i = 0; i < 6; i++)
            cube.material[i].color.set(0x111111);

        // face mappings including inner cubes
        // FRONT (+Z) - material[4]
        if (z >= HALF - 1 && (z >= x && x >= -z) && (z >= y && y >= -z)) {
            let row = HALF - y;
            let col = x + HALF;
            cube.material[4].color.set(
                colorMap[state[getFaceletIndex("F", row, col)]]
            );
        }

        // BACK (-Z) - material[5]
        if (z <= -HALF + 1 && (z <= x && x <= -z) && (z <= y && y <= -z)) {
            let row = HALF - y;
            let col = HALF - x;
            cube.material[5].color.set(
                colorMap[state[getFaceletIndex("B", row, col)]]
            );
        }

        // RIGHT (+) - material[0]
        if (x >= HALF - 1 && (x >= y && y >= -x) && (x >= z && z >= -x)) {
            let row = HALF - y;
            let col = HALF - z;
            cube.material[0].color.set(
                colorMap[state[getFaceletIndex("R", row, col)]]
            );
        }

        // LEFT (-) - material[1]
        if (x <= -HALF + 1 && (x <= y && y <= -x) && (x <= z && z <= -x)) {
            let row = HALF - y;
            let col = z + HALF;
            cube.material[1].color.set(
                colorMap[state[getFaceletIndex("L", row, col)]]
            );
        }

        // UP (+Y) - material[2]
        if (y >= HALF - 1 && (y >= x && x >= -y) && (y >= z && z >= -y)) {
            let row = z + HALF;
            let col = x + HALF;
            cube.material[2].color.set(
                colorMap[state[getFaceletIndex("U", row, col)]]
            );
        }

        // DOWN (-Y) - material[3]
        if (y <= -HALF + 1 && (y <= x && x <= -y) && (y <= z && z <= -y)) {
            let row = HALF - z;
            let col = x + HALF;
            cube.material[3].color.set(
                colorMap[state[getFaceletIndex("D", row, col)]]
            );
        }
    });
}


function applyMove(move, layers=0, indexToMove=0){
    let face = move[0];
    let angle = -Math.PI / 2;
    if (move.includes("'")) angle = Math.PI/2;
    if (move.includes("2")) angle = Math.PI;

    const axisData = faceAxis[face];
    if (!axisData) return;

    let axis = new THREE.Vector3(
        axisData.axis === 'x' ? 1 : 0,
        axisData.axis === 'y' ? 1 : 0,
        axisData.axis === 'z' ? 1 : 0
    );

    if (face === 'L' || face === 'D' || face === 'B')
        angle *= -1;

    // compute which cubies to rotate
    const rotatingCubies = cubies.filter(c => {
        const sign = axisData.coord >= 0 ? 1 : -1;
        return c.userData.coords[axisData.axis] === axisData.coord - indexToMove * sign
    });

    rotateFace(rotatingCubies, angle, axis);
}


// function getLayerCoordsForFace(face, layers = 1) {
//     // layers counts how many planes starting from the face plane inward
//     // e.g. layers=2 for N=5 & face='F' -> coords [HALF, HALF-1]
//     const axisData = faceAxis[face];
//     if (!axisData) return [];

//     const sign = axisData.coord >= 0 ? 1 : -1;
//     const coords = [];
//     for (let i = 0; i < layers; i++) {
//         coords.push(axisData.coord - i * sign);
//     }
//     return coords;
// }


function rotateFace(rotatingCubies, angle, axis) {
    const pivot = new THREE.Object3D();
    scene.add(pivot);
    rotatingCubies.forEach(c => pivot.attach(c));

    let currentAngle = 0;
    const totalAngle = angle;
    const duration = 250;
    const start = Date.now();

    function animateRotation() {
        const t = (Date.now() - start) / duration;
        const progress = Math.min(1, t);
        let delta = totalAngle * progress - currentAngle;

        pivot.rotateOnAxis(axis, delta);
        currentAngle += delta;

        if (progress < 1) {
            requestAnimationFrame(animateRotation);
        } else {
            pivot.updateMatrixWorld();
            rotatingCubies.forEach(c => {
                scene.attach(c);

                c.position.x = Math.round(c.position.x* 2) / 2;
                c.position.y = Math.round(c.position.y* 2) / 2;
                c.position.z = Math.round(c.position.z* 2) / 2;

                c.userData.coords.x = c.position.x;
                c.userData.coords.y = c.position.y;
                c.userData.coords.z = c.position.z;

                c.rotation.x = Math.round(c.rotation.x / (Math.PI/2)) * Math.PI/2;
                c.rotation.y = Math.round(c.rotation.y / (Math.PI/2)) * Math.PI/2;
                c.rotation.z = Math.round(c.rotation.z / (Math.PI/2)) * Math.PI/2;
            });

            scene.remove(pivot);
        }
    }
    animateRotation();
}
