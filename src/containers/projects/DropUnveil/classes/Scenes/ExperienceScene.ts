import * as THREE from 'three';
import { OrbitControls } from 'three-stdlib';
import GUI from 'lil-gui';

import { MouseMove } from 'utils/helperClasses/MouseMove';
import { UpdateInfo, Bounds, LoadedAssets } from 'utils/sharedTypes';

import { InteractiveScene } from './InteractiveScene';
import { Background3D } from '../Components/Background3D';
import { Lense3D } from '../Components/Lense3D';
import fragmentLense from '../shaders/lense/fragment.glsl';
import vertexLense from '../shaders/lense/vertex.glsl';
import { TextPlane3D } from '../Components/TextPlane3D';

interface Constructor {
  camera: THREE.PerspectiveCamera;
  mouseMove: MouseMove;
  controls: OrbitControls;
  gui: GUI;
}

export class ExperienceScene extends InteractiveScene {
  _controls: OrbitControls;
  _background3D: Background3D;
  _loadedAssets: LoadedAssets | null = null;
  _lense3D: Lense3D;
  _planeGeometry = new THREE.PlaneGeometry(1, 1, 32, 32);
  _textPlaneEn: TextPlane3D;

  constructor({ gui, controls, camera, mouseMove }: Constructor) {
    super({ camera, mouseMove, gui });
    this._controls = controls;

    this._textPlaneEn = new TextPlane3D({ geometry: this._planeGeometry, gui });
    this.add(this._textPlaneEn);

    this._lense3D = new Lense3D({
      gui,
      geometry: this._planeGeometry,
      fragmentShader: fragmentLense,
      vertexShader: vertexLense,
    });
    this.add(this._lense3D);

    this._background3D = new Background3D({ gui });
    this.add(this._background3D);
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  animateIn() {}

  update(updateInfo: UpdateInfo) {
    super.update(updateInfo);
    this._background3D.setMouse2D(this._mouse2D);
    this._background3D.update(updateInfo);

    this._lense3D.setMouse2D(this._mouse2D);
    this._lense3D.update(updateInfo);

    this._textPlaneEn.setMouse2D(this._mouse2D);
    this._textPlaneEn.update(updateInfo);
  }

  setLoadedAssets(assets: LoadedAssets) {
    this._loadedAssets = assets;
    this._lense3D.setAsset(this._loadedAssets['lense']);
  }

  setRendererBounds(bounds: Bounds) {
    super.setRendererBounds(bounds);
    this._background3D.setSize({
      width: this._rendererBounds.width * 1.001,
      height: this._rendererBounds.height * 1.001,
    });

    this._lense3D.setRendererBounds(bounds);
    this._lense3D.setSize({
      width: 250,
      height: 250,
    });

    this._textPlaneEn.setRendererBounds(bounds);
    this._textPlaneEn.setSize(bounds);
  }

  destroy() {
    this._background3D.destroy();
    this.remove(this._background3D);

    this._lense3D.destroy();
    this.remove(this._lense3D);

    this._textPlaneEn.destroy();
    this.remove(this._textPlaneEn);

    this._planeGeometry.dispose();
  }
}
