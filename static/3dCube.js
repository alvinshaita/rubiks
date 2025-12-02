// 3D view
let scene,camera,renderer,controls;
const cubies = []; // Array of THREE.Mesh objects

const colorMap = {
    "W":0xffffff, "R":0xff0000, "G":0x00ff00, "Y":0xffff00,
    "O":0xffa500, "B":0x0000ff, "_":0xcccccc
};
const CUBIE_SIZE = 1;
const GAP_SIZE = 0.02;

// Map Face to Axis and Coordinate for identifying layers
const faceAxis = {
    'U': { axis: 'y', coord: 1 }, 'D': { axis: 'y', coord: -1 },
    'R': { axis: 'x', coord: 1 }, 'L': { axis: 'x', coord: -1 },
    'F': { axis: 'z', coord: 1 }, 'B': { axis: 'z', coord: -1 }
};

const faceStateMap = {
    'U': {start: 0, end: 8}, 'L': {start: 9, end: 17}, 'F': {start: 18, end: 26},
    'R': {start: 27, end: 35}, 'B': {start: 36, end: 44}, 'D': {start: 45, end: 53}
};
const getFaceletStateIndex = (face, i) => faceStateMap[face].start + i;
const getFaceletStateIndexFromEnd = (face, i) => faceStateMap[face].end - i;

function init3DCube(){
    scene=new THREE.Scene();
    camera=new THREE.PerspectiveCamera(45,1,0.1,1000);
    camera.position.set(4, 4, 6);
    renderer=new THREE.WebGLRenderer({antialias:true});
    renderer.setSize(400,400);
    document.getElementById("cube3d").appendChild(renderer.domElement);

    controls=new THREE.OrbitControls(camera,renderer.domElement);
    controls.enableDamping=true; controls.dampingFactor=0.1; controls.rotateSpeed=0.5;

    const light=new THREE.AmbientLight(0xffffff,0.8); scene.add(light);
    const dirLight=new THREE.DirectionalLight(0xffffff,0.5); dirLight.position.set(10,10,10); scene.add(dirLight);

    const geometry=new THREE.BoxGeometry(CUBIE_SIZE-GAP_SIZE, CUBIE_SIZE-GAP_SIZE, CUBIE_SIZE-GAP_SIZE);
    
    // Create the 27 cubies
    for(let x=-1;x<=1;x++){
        for(let y=-1;y<=1;y++){
            for(let z=-1;z<=1;z++){
                const materials=[];
                // Standard THREE.js face order: 0: R, 1: L, 2: U, 3: D, 4: F, 5: B
                for(let i=0;i<6;i++){
                    materials.push(new THREE.MeshPhongMaterial({color:0x111111})); // Use Phong material for lighting effects
                }
                const cube=new THREE.Mesh(geometry,materials);
                cube.position.set(x * CUBIE_SIZE, y * CUBIE_SIZE, z * CUBIE_SIZE);
                
                cube.userData.coords = {x, y, z}; // Logical coordinates (x,y,z in {-1, 0, 1})
                cube.userData.initialPos = cube.position.clone();
                cube.userData.initialRot = cube.rotation.clone();

                cubies.push(cube);
                scene.add(cube);
            }
        }
    }

    animate3D();
}

function reset3DCube() {
    for (let cubie of cubies) {
        const { x, y, z } = cubie.userData.coords;
        cubie.position.set(x, y, z);
        // absolute rotation reset
        cubie.rotation.set(0, 0, 0);
    }
}

function animate3D(){
    requestAnimationFrame(animate3D);
    controls.update();
    renderer.render(scene,camera);
}

function initializeCubieColors(state){
    if(state.length!==54) return;
    // face indices: 0: R(+X), 1: L(-X), 2: U(+Y), 3: D(-Y), 4: F(+Z), 5: B(-Z)
    // NOTE: careful with U and D, they are inverted

    for(let i = 0; i < cubies.length; i++){
        const cubie = cubies[i];
        const {x, y, z} = cubie.userData.coords;
        
        // R face: +X (material[0]) -> index 9-17
        if (x === 1) cubie.material[0].color.set(
            colorMap[state[getFaceletStateIndex('R', (1-y) * 3 + (1-z))]] || 0x111111
        );
        
        // L face: -X (material[1]) -> index 36-44
        if (x === -1) cubie.material[1].color.set(
            colorMap[state[getFaceletStateIndex('L', (1-y) * 3 + (z+1))]] || 0x111111
        );
        
        // U face: +Y (material[2]) -> index 0-8
        if (y === 1) cubie.material[2].color.set(
            colorMap[state[getFaceletStateIndex('U', (1+x) + (1+z) * 3)]] || 0x111111
        );
        
        // D face: -Y (material[3]) -> index 27-35
        if (y === -1) cubie.material[3].color.set(
            colorMap[state[getFaceletStateIndex('D', (1+x) + (1-z) * 3)]] || 0x111111
        );
        
        // F face: +Z (material[4]) -> index 18-26
        if (z === 1) cubie.material[4].color.set(
            colorMap[state[getFaceletStateIndex('F', (1-y) * 3 + (1+x))]] || 0x111111
        );
        
        // B face: -Z (material[5]) -> index 45-53
        if (z === -1) cubie.material[5].color.set(
            colorMap[state[getFaceletStateIndex('B', (1-y) * 3 + (1-x))]] || 0x111111
        );

        // Hide inner faces
        if (x !== 1) cubie.material[0].color.set(0x111111);
        if (x !== -1) cubie.material[1].color.set(0x111111);
        if (y !== 1) cubie.material[2].color.set(0x111111);
        if (y !== -1) cubie.material[3].color.set(0x111111);
        if (z !== 1) cubie.material[4].color.set(0x111111);
        if (z !== -1) cubie.material[5].color.set(0x111111);
        
        cubie.material.forEach(m => m.needsUpdate = true);
    }
}

function applyMove(move, newState){
    rotateFace(move, newState); 
}


function rotateFace(move, newState) {
    // 1. Determine Face, Axis, and Angle
    let face = move[0];
    let angle = -Math.PI / 2; // 90 degrees
    if (move.includes("'")) angle = Math.PI / 2; // Counter-clockwise (U' is -90deg on Y axis)
    if (move.includes("2")) angle = Math.PI; // 180 degrees
    
    const axisData = faceAxis[face];
    if (!axisData) return;
    

    let axis = new THREE.Vector3();
    let rotationAxis = axisData.axis;

    if (rotationAxis === 'x') axis.set(1, 0, 0);
    else if (rotationAxis === 'y') axis.set(0, 1, 0);
    else if (rotationAxis === 'z') axis.set(0, 0, 1);
    
    // Reverse rotation direction for L, D, B to match standard notation from outside view
    if (face === 'L' || face === 'D' || face === 'B') {
        angle *= -1; 
    }

    // 2. Identify Cubies to Rotate
    const rotatingCubies = cubies.filter(cubie => {
        // Check if the cubie is in the correct layer
        return Math.round(cubie.userData.coords[rotationAxis]) === axisData.coord;
    });
    
    if (rotatingCubies.length === 0) return;
    
    // 3. Create a pivot (Parent) object for the animation
    const pivot = new THREE.Object3D();
    scene.add(pivot);
    
    // 4. Temporarily parent the cubies to the pivot
    rotatingCubies.forEach(cubie => {
        pivot.attach(cubie); 
    });

    let currentAngle = 0;
    const totalAngle = angle;
    const duration = 250; // ms
    const startTime = Date.now();
    
    function animateRotation() {
        const elapsed = Date.now() - startTime;
        let progress = Math.min(1, elapsed / duration);
        let deltaAngle = totalAngle * progress - currentAngle;
        
        pivot.rotateOnAxis(axis, deltaAngle);
        currentAngle += deltaAngle;
        if (progress < 1) {
            requestAnimationFrame(animateRotation);
        } else {
            // 5. Rotation complete: Unparent and update state/coords            
            pivot.updateMatrixWorld();

            // Unparent and update cubie coordinates
            rotatingCubies.forEach(cubie => {
                scene.attach(cubie); 
                
                // Snap position to nearest integer
                const newPos = cubie.position.clone();
                cubie.position.x = Math.round(newPos.x / CUBIE_SIZE) * CUBIE_SIZE;
                cubie.position.y = Math.round(newPos.y / CUBIE_SIZE) * CUBIE_SIZE;
                cubie.position.z = Math.round(newPos.z / CUBIE_SIZE) * CUBIE_SIZE;

                // Update the cubie's logical coordinates
                cubie.userData.coords.x = Math.round(cubie.position.x / CUBIE_SIZE);
                cubie.userData.coords.y = Math.round(cubie.position.y / CUBIE_SIZE);
                cubie.userData.coords.z = Math.round(cubie.position.z / CUBIE_SIZE);
                
                // Snap rotation to nearest 90 degrees
                cubie.rotation.x = Math.round(cubie.rotation.x / (Math.PI / 2)) * (Math.PI / 2);
                cubie.rotation.y = Math.round(cubie.rotation.y / (Math.PI / 2)) * (Math.PI / 2);
                cubie.rotation.z = Math.round(cubie.rotation.z / (Math.PI / 2)) * (Math.PI / 2);
            });
            
            scene.remove(pivot);
        }
    }
    animateRotation();
}
