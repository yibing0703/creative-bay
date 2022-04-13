import * as THREE from 'three';
import { GLTF } from 'three-stdlib';
import GUI from 'lil-gui';
import TWEEN, { Tween } from '@tweenjs/tween.js';

import { MouseMove } from 'utils/helperClasses/MouseMove';
import { UpdateInfo, LoadedAssets, AnimateCamera } from 'utils/sharedTypes';
import { lerp } from 'utils/functions/lerp';
import { sharedValues } from 'utils/sharedValues';

import { InteractiveScene } from './InteractiveScene';
import { PostProcess } from '../App';
import { Particles3D } from '../Components/Particles3D';
import neonFragment from '../shaders/neon/fragmentShader.glsl';
import neonVertex from '../shaders/neon/vertexShader.glsl';

interface Constructor {
  camera: THREE.PerspectiveCamera;
  mouseMove: MouseMove;
  gui: GUI;
  postProcess: PostProcess;
}

export class ExperienceScene extends InteractiveScene {
  _loadedAssets: LoadedAssets | null = null;
  _blenderScene: THREE.Group | null = null;
  _bakedMaterial1: THREE.MeshBasicMaterial | null = null;
  _bakedMaterial2: THREE.MeshBasicMaterial | null = null;
  _bakedMaterial3: THREE.MeshBasicMaterial | null = null;
  _bakedMaterial4: THREE.MeshBasicMaterial | null = null;
  _lightMaterial = new THREE.MeshBasicMaterial({
    color: 0xffffff,
  });
  _neonMaterial = new THREE.ShaderMaterial({
    depthWrite: false,
    transparent: true,
    uniforms: { uTime: { value: 0 } },
    vertexShader: neonVertex,
    fragmentShader: neonFragment,
  });
  _glassMaterial = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.45,
  });
  _glassDarkMaterial = new THREE.MeshBasicMaterial({
    color: 0x000000,
    transparent: true,
    opacity: 0.3,
  });
  _cameraFocus = {
    current: 13,
    target: 13,
  };
  _postProcess: PostProcess;
  _particles3D = new Particles3D();
  _cameraTween: Tween<{ cameraPosition: THREE.Vector3 }> | null = null;

  constructor({ gui, camera, mouseMove, postProcess }: Constructor) {
    super({ camera, mouseMove, gui });
    this._postProcess = postProcess;
    this.add(this._particles3D);
  }

  setLoadedAssets(assets: LoadedAssets) {
    this._loadedAssets = assets;
    this._blenderScene = (this._loadedAssets['officeSrc'].asset as GLTF).scene;

    (this._loadedAssets['render1Src'].asset as THREE.Texture).flipY = false;
    (this._loadedAssets['render1Src'].asset as THREE.Texture).encoding = THREE.sRGBEncoding;
    this._bakedMaterial1 = new THREE.MeshBasicMaterial({
      map: this._loadedAssets['render1Src'].asset as THREE.Texture,
    });

    (this._loadedAssets['render2Src'].asset as THREE.Texture).flipY = false;
    (this._loadedAssets['render2Src'].asset as THREE.Texture).encoding = THREE.sRGBEncoding;
    this._bakedMaterial2 = new THREE.MeshBasicMaterial({
      map: this._loadedAssets['render2Src'].asset as THREE.Texture,
    });

    (this._loadedAssets['render3Src'].asset as THREE.Texture).flipY = false;
    (this._loadedAssets['render3Src'].asset as THREE.Texture).encoding = THREE.sRGBEncoding;
    this._bakedMaterial3 = new THREE.MeshBasicMaterial({
      map: this._loadedAssets['render3Src'].asset as THREE.Texture,
    });

    const render1Mesh = this._blenderScene.children.find(
      child => child.name === 'render1'
    ) as THREE.Mesh;
    if (render1Mesh) render1Mesh.material = this._bakedMaterial1;

    const render2Mesh = this._blenderScene.children.find(
      child => child.name === 'render2'
    ) as THREE.Mesh;
    if (render2Mesh) render2Mesh.material = this._bakedMaterial2;

    const render3Mesh = this._blenderScene.children.find(
      child => child.name === 'render3'
    ) as THREE.Mesh;
    if (render3Mesh) render3Mesh.material = this._bakedMaterial3;

    const champGlassMesh = this._blenderScene.children.find(
      child => child.name === 'champGlass'
    ) as THREE.Mesh;
    if (champGlassMesh) champGlassMesh.material = this._glassMaterial;

    const glassMesh = this._blenderScene.children.find(
      child => child.name === 'glass'
    ) as THREE.Mesh;
    if (glassMesh) glassMesh.material = this._glassMaterial;

    const barGlassMesh = this._blenderScene.children.find(
      child => child.name === 'bufet'
    ) as THREE.Mesh;
    if (barGlassMesh) barGlassMesh.material = this._glassDarkMaterial;

    const emissionMesh = this._blenderScene.children.find(
      child => child.name === 'emission'
    ) as THREE.Mesh;
    if (emissionMesh) emissionMesh.material = this._lightMaterial;

    const extraFrameMesh = this._blenderScene.children.find(
      child => child.name === 'extraFrame'
    ) as THREE.Mesh;
    if (extraFrameMesh) extraFrameMesh.material = this._lightMaterial;

    const neonMesh = this._blenderScene.children.find(child => child.name === 'neon') as THREE.Mesh;
    if (neonMesh) neonMesh.material = this._neonMaterial;

    const windowsMesh = this._blenderScene.children.find(
      child => child.name === 'windows'
    ) as THREE.Mesh;
    if (windowsMesh) windowsMesh.material = this._lightMaterial;

    if (this._blenderScene) this.add(this._blenderScene);
  }

  _handleDepthOfField(updateInfo: UpdateInfo) {
    this._raycaster.setFromCamera(
      new THREE.Vector2(this._mouse3D.target.x * 1.6, this._mouse3D.target.y * 1.6), //*1.6 so the use doesnt have to mousemove through the whole screen to get focus quicker
      this._camera
    );

    const intersects = this._raycaster.intersectObjects(this.children, true);

    for (let i = 0; i < intersects.length; ++i) {
      const intersect = intersects[i];
      if (intersect.object.name === 'render1') {
        this._cameraFocus.target = intersect.distance;
      }
    }

    this._cameraFocus.current = lerp(
      this._cameraFocus.current,
      this._cameraFocus.target,
      sharedValues.motion.LERP_EASE
    );

    if (this._postProcess.bokehPass) {
      this._postProcess.bokehPass.materialBokeh.uniforms.focus.value = this._cameraFocus.current;
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  animateIn() {
    this._animateCamera({ position: new THREE.Vector3(5.5, 4.5, 8) });
  }

  _animateCamera({ duration = 2300, position }: AnimateCamera) {
    if (this._cameraTween) {
      this._cameraTween.stop();
    }

    const from = {
      cameraPosition: new THREE.Vector3(
        this._camera.position.x,
        this._camera.position.y,
        this._camera.position.z
      ),
    };

    const to = { cameraPosition: position };

    this._cameraTween = new TWEEN.Tween(from)
      .to(to)
      .delay(duration * 0.6)
      .duration(duration)
      .easing(TWEEN.Easing.Exponential.InOut)
      .onUpdate(obj => {
        this._camera.position.set(obj.cameraPosition.x, obj.cameraPosition.y, obj.cameraPosition.z);
      });

    this._cameraTween.start();
  }

  update(updateInfo: UpdateInfo) {
    super.update(updateInfo);
    this._handleDepthOfField(updateInfo);
    this._particles3D.update(updateInfo);
    this._neonMaterial.uniforms.uTime.value = updateInfo.time * 0.001;
  }

  destroy() {
    if (this._blenderScene) this.remove(this._blenderScene);
    this._bakedMaterial1?.dispose();
    this._bakedMaterial2?.dispose();
    this._bakedMaterial3?.dispose();
    this._bakedMaterial4?.dispose();
    this._glassMaterial?.dispose();
    this._glassDarkMaterial?.dispose();
    this._lightMaterial?.dispose();
    this._neonMaterial.dispose();
    this.remove(this._particles3D);
    this._blenderScene && this.remove(this._blenderScene);
  }
}
