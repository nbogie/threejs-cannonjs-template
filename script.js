import * as THREE from 'https://unpkg.com/three@0.122.0/build/three.module.js';
import { OrbitControls } from 'https://unpkg.com/three@0.122.0/examples/jsm/controls/OrbitControls.js';

import { setupLights } from "./modules/lights.js";
import { setupGround } from "./modules/ground.js";
import { pick } from "./modules/random.js";
import { InputManager } from "./modules/InputManager.js";

import { setupPostProcessingComposer } from "./modules/postProcessing.js";
import { setupPhysics, createCubeBody, createPlayingCardBody } from "./modules/physics.js";

let physicsBoundMeshes = [];

function changeTexture(mesh) {
  new THREE.TextureLoader().load(
    "./textures/chirag_nayak.jpeg",
    texture => {
      //Update Texture
      mesh.material.map = texture;
      mesh.material.needsUpdate = true;
    });
  //"https://unsplash.com/photos/iZwQbx4T8bQ",
}

function r(v) {
  return Math.random() * v - v / 2;
}

function randomPosition(range) {
  return new THREE.Vector3(r(range), 1 + Math.random() * (range - 1), r(range));
}

function addPlayingCard(world, scene) {
  const pos = randomPosition(20);

  const geometry = new THREE.PlaneGeometry(2.5, 3.5, 1);
  const material = new THREE.MeshLambertMaterial({ color: 0xDDDDDD, side: THREE.DoubleSide });

  const mesh = new THREE.Mesh(geometry, material);
  scene.add(mesh);

  changeTexture(mesh);
  const body = createPlayingCardBody(world, mesh.position);
  body.position.copy(pos);
  physicsBoundMeshes.push({ mesh: mesh, body: body });
  scene.add(mesh);
}

function setupCamera() {
  // The camera
  const camera = new THREE.PerspectiveCamera(
    30,
    window.innerWidth / window.innerHeight,
    1,
    10000
  );
  // Make the camera further from the models so we can see them better
  camera.position.z = 15;
  camera.position.y = 5;
  return camera;
}

async function setupAsync() {
  // The three.js scene: the 3D world where you put objects
  const scene = new THREE.Scene();
  scene.background = new THREE.Color("hsl(190, 30%, 75%)");
  let isPaused = false;


  const inputManager = new InputManager();


  //Not necessary as I've made the canvas element in the HTML file and passed it to the renderer constructor
  //Previous method had us appending the renderer canvas into <body>
  // document.body.appendChild(renderer.domElement);

  setupGround(scene);

  const { world } = setupPhysics();

  const gridHelper = new THREE.GridHelper(100, 20);
  scene.add(gridHelper);
  const axesHelper = new THREE.AxesHelper(5);
  scene.add(axesHelper);


  // let drivingForceVisYel = new THREE.ArrowHelper(new THREE.Vector3(1, 0, 0), sphereBody.position, 4, 0xffff00);
  // scene.add(drivingForceVisYel);

  function pushSphere(sphereBody, force) {
    const centerInWorldCoords = sphereBody.pointToWorldFrame(new CANNON.Vec3());
    sphereBody.applyImpulse(force, centerInWorldCoords);
  }


  const heading = 0;

  function updatePhysics() {

    const drivingForceFwd = new THREE.Vector3(0, 0, 10);
    drivingForceFwd.applyAxisAngle(new THREE.Vector3(0, 1, 0), heading);

    if (inputManager.keys.up.down) {
      pushSphere(drivingForceFwd);
    }

    // visualisations of driving drivingForceFwd
    // drivingForceVisYel.setDirection(drivingForceFwd);
    // drivingForceVisYel.position.copy(sphereBody.position);

    // Step the physics world
    const timeStep = 1 / 60;
    world.step(timeStep);
    // Copy coordinates from Cannon.js to Three.js
    physicsBoundMeshes.forEach(({ mesh, body }) => {
      mesh.position.copy(body.position);
      mesh.quaternion.copy(body.quaternion);
    });
  }

  const canvas = document.querySelector('canvas');
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    // alpha: true,
    // premultipliedAlpha: false,
  });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setClearColor(0xaaaaaa, 1);


  const camera = setupCamera();
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 0, 0);
  controls.update();


  let { composer, functions: postProcessingControls } = setupPostProcessingComposer(renderer, scene, camera);

  setupLights(scene);

  function togglePause() {
    console.log("toggling pause")
    isPaused = !isPaused;
  }
  function render(timeMs) {
    const timeS = timeMs / 1000;

    inputManager.keys.pause.justPressed && togglePause();
    if (isPaused) {
      inputManager.updateAtEndOfFrame();
      requestAnimationFrame(render);
      return;
    }

    document.getElementById("info").innerText = `Time: ${(timeS).toFixed(1)}`;

    const delta = (inputManager.keys.left.down ? 1 : 0) +
      (inputManager.keys.right.down ? -1 : 0);


    // inputManager.keys.addRandomObject.justPressed && addRandomObjectAt(new THREE.Vector3(0, 5, 0), world, scene);
    inputManager.keys.addRandomObject.justPressed && addPlayingCard(world, scene);

    updatePhysics();

    if (composer) {
      composer.render();
    } else {
      renderer.render(scene, camera);
    }

    inputManager.updateAtEndOfFrame();
    // Make it call the render() function about every 1/60 second
    //always call this last so we stop on an error in the above.
    requestAnimationFrame(render);
  }

  render();
}

setupAsync();
