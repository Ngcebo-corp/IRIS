import * as THREE from "three";
import { IrisState, IrisExpression, LipSyncData, HeadPose, RobotDollName } from "../types";
import { DOLL_PROFILES } from "../data/dollProfiles";

export class IrisHead3D {
  private container: HTMLElement;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private animFrameId: number = 0;

  // Hierarchical nodes
  public rootGroup: THREE.Group;
  public pedestalGroup: THREE.Group;
  public neckGroup: THREE.Group;
  public headGroup: THREE.Group;
  public jawGroup: THREE.Group;

  // Doll Hairstyles & Accessories Groups
  private barbieHairGroup: THREE.Group;
  private moanaHairGroup: THREE.Group;
  private irisHairGroup: THREE.Group;

  // Facial elements
  private leftEyeGroup: THREE.Group;
  private rightEyeGroup: THREE.Group;
  private leftPupil: THREE.Mesh;
  private rightPupil: THREE.Mesh;
  private leftIrisMesh: THREE.Mesh;
  private rightIrisMesh: THREE.Mesh;
  private leftInnerIrisMesh: THREE.Mesh;
  private rightInnerIrisMesh: THREE.Mesh;
  private leftUpperEyelid: THREE.Mesh;
  private rightUpperEyelid: THREE.Mesh;
  private leftLowerEyelid: THREE.Mesh;
  private rightLowerEyelid: THREE.Mesh;
  private leftBrowMesh: THREE.Mesh;
  private rightBrowMesh: THREE.Mesh;
  private vocalizerLight: THREE.PointLight;
  private vocalizerMesh: THREE.Mesh;

  // Neck pistons & spine
  private leftPistonRod: THREE.Mesh;
  private rightPistonRod: THREE.Mesh;
  private leftPistonCylinder: THREE.Mesh;
  private rightPistonCylinder: THREE.Mesh;
  private vertebraeMeshes: THREE.Mesh[] = [];
  private neckSpacerMeshes: THREE.Mesh[] = [];

  // Dynamic Materials for doll customization
  private dermalPlateMat: THREE.MeshStandardMaterial;
  private obsidianShellMat: THREE.MeshStandardMaterial;
  private titaniumFrameMat: THREE.MeshStandardMaterial;
  private glowMaterial: THREE.MeshStandardMaterial;
  private pulseGlowMaterials: THREE.MeshStandardMaterial[] = [];
  private irisMat: THREE.MeshStandardMaterial;
  private innerApertureMat: THREE.MeshBasicMaterial;
  private lipMat: THREE.MeshStandardMaterial;
  private browMat: THREE.MeshStandardMaterial;
  private eyelashMat: THREE.MeshStandardMaterial;
  private pedestalCollarMat: THREE.MeshStandardMaterial;
  private pedestalNeonMat: THREE.MeshStandardMaterial;
  private haloMat: THREE.MeshBasicMaterial;

  // Lights for dynamic doll tinting
  private keyLight: THREE.DirectionalLight;
  private rimLight: THREE.DirectionalLight;
  private underLight: THREE.PointLight;
  private ambientLight: THREE.AmbientLight;

  // Seam lines
  private seamLineL: THREE.Line;
  private seamLineR: THREE.Line;

  // Dynamic state
  public currentDoll: RobotDollName = "Barbie";
  public state: IrisState = "idle";
  public expression: IrisExpression = "neutral";
  public lipSync: LipSyncData = {
    volume: 0,
    open: 0,
    width: 0.5,
    pucker: 0,
    vowel: "rest",
  };

  // Tracking targets
  public targetLook: { x: number; y: number } = { x: 0, y: 0 };
  public currentLook: { x: number; y: number } = { x: 0, y: 0 };
  public targetHeadPose: HeadPose = { pitch: 0, yaw: 0, roll: 0, neckY: 0 };
  public currentHeadPose: HeadPose = { pitch: 0, yaw: 0, roll: 0, neckY: 0 };

  // Blinking & idle state
  private blinkTimer = 0;
  private blinkDuration = 0.18;
  private blinkProgress = 0;
  private isBlinking = false;
  private time = 0;

  // Camera orbit controls
  public isDragging = false;
  private prevPointerX = 0;
  private prevPointerY = 0;
  public orbitAngleX = 0;
  public orbitAngleY = 0;
  public cameraDistance = 3.8;

  constructor(container: HTMLElement, initialDoll: RobotDollName = "Barbie") {
    this.container = container;
    this.currentDoll = initialDoll;

    // Scene
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x050811, 0.14);

    // Camera
    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;
    this.camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 100);
    this.camera.position.set(0, 0.25, this.cameraDistance);

    // Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(this.renderer.domElement);

    // Main hierarchy groups
    this.rootGroup = new THREE.Group();
    this.scene.add(this.rootGroup);

    this.pedestalGroup = new THREE.Group();
    this.rootGroup.add(this.pedestalGroup);

    this.neckGroup = new THREE.Group();
    this.rootGroup.add(this.neckGroup);

    this.headGroup = new THREE.Group();
    this.rootGroup.add(this.headGroup);

    this.jawGroup = new THREE.Group();
    this.headGroup.add(this.jawGroup);

    // Hair groups
    this.barbieHairGroup = new THREE.Group();
    this.moanaHairGroup = new THREE.Group();
    this.irisHairGroup = new THREE.Group();
    this.headGroup.add(this.barbieHairGroup);
    this.headGroup.add(this.moanaHairGroup);
    this.headGroup.add(this.irisHairGroup);

    // Initialize core materials
    this.initMaterials();

    // Setup Lighting
    this.setupLighting();

    // Build Model Components (Doll anatomy strictly head and neck only)
    this.buildPedestal();
    this.buildNeckMechanics();
    this.buildCraniumAndFace();
    this.buildEyesAndLashes();
    this.buildJawAndDollLips();
    this.buildBarbieDollHair();
    this.buildMoanaDollHair();
    this.buildIrisDollHair();
    this.buildHolographicRings();

    // Apply initial doll profile
    this.applyDollProfile(initialDoll);

    // Bind event listeners
    this.bindEvents();

    // Start animation loop
    this.animate = this.animate.bind(this);
    this.animFrameId = requestAnimationFrame(this.animate);
  }

  private initMaterials() {
    const profile = DOLL_PROFILES[this.currentDoll];

    // Dermal plates (beautiful porcelain doll finish with smooth highlights)
    this.dermalPlateMat = new THREE.MeshStandardMaterial({
      color: profile.dermalColor,
      roughness: profile.dermalRoughness,
      metalness: profile.dermalMetalness,
    });

    // Cranial shell (metallic lacquer shell)
    this.obsidianShellMat = new THREE.MeshStandardMaterial({
      color: profile.shellColor,
      roughness: 0.16,
      metalness: 0.85,
    });

    // Titanium structural frame & seams
    this.titaniumFrameMat = new THREE.MeshStandardMaterial({
      color: profile.trimColor,
      roughness: 0.28,
      metalness: 0.92,
    });

    // Glowing cyber conduits & accent lights
    this.glowMaterial = new THREE.MeshStandardMaterial({
      color: profile.glowColor,
      emissive: profile.glowEmissive,
      emissiveIntensity: 2.4,
      roughness: 0.1,
      metalness: 0.8,
    });
    this.pulseGlowMaterials.push(this.glowMaterial);

    // Eye aperture iris
    this.irisMat = new THREE.MeshStandardMaterial({
      color: profile.irisColor,
      emissive: profile.irisColor,
      emissiveIntensity: 2.8,
      roughness: 0.1,
      metalness: 0.9,
    });
    this.pulseGlowMaterials.push(this.irisMat);

    // Inner eye aperture ring
    this.innerApertureMat = new THREE.MeshBasicMaterial({
      color: profile.innerIrisColor,
    });

    // Glossy doll lips (luxurious doll lip gloss lacquer)
    this.lipMat = new THREE.MeshStandardMaterial({
      color: profile.lipColor,
      roughness: 0.08,
      metalness: 0.18,
    });

    // Eyebrows
    this.browMat = new THREE.MeshStandardMaterial({
      color: profile.eyebrowColor,
      roughness: 0.4,
      metalness: 0.5,
    });

    // Eyelashes (sleek dark metallic doll eyelashes)
    this.eyelashMat = new THREE.MeshStandardMaterial({
      color: 0x09090b,
      roughness: 0.2,
      metalness: 0.9,
    });

    // Pedestal collar and neon
    this.pedestalCollarMat = new THREE.MeshStandardMaterial({
      color: 0x0c101c,
      metalness: 0.92,
      roughness: 0.2,
    });

    this.pedestalNeonMat = new THREE.MeshStandardMaterial({
      color: profile.glowColor,
      emissive: profile.glowEmissive,
      emissiveIntensity: 2.2,
    });
    this.pulseGlowMaterials.push(this.pedestalNeonMat);

    // Holographic telemetry ring
    this.haloMat = new THREE.MeshBasicMaterial({
      color: profile.glowColor,
      transparent: true,
      opacity: 0.35,
      side: THREE.DoubleSide,
    });
  }

  private setupLighting() {
    this.ambientLight = new THREE.AmbientLight(0x0e172a, 1.5);
    this.scene.add(this.ambientLight);

    // Front-top key light
    this.keyLight = new THREE.DirectionalLight(0xfff5ea, 2.3);
    this.keyLight.position.set(2, 4, 3.5);
    this.keyLight.castShadow = true;
    this.scene.add(this.keyLight);

    // Dynamic doll-tinted rim light
    this.rimLight = new THREE.DirectionalLight(0xff2a85, 2.8);
    this.rimLight.position.set(-3.5, 1.5, -1.5);
    this.scene.add(this.rimLight);

    // Deep back light
    const backLight = new THREE.DirectionalLight(0x38bdf8, 1.8);
    backLight.position.set(0, 3, -4);
    this.scene.add(backLight);

    // Warm under-chin reflection light
    this.underLight = new THREE.PointLight(0xf472b6, 1.2, 5);
    this.underLight.position.set(0, -1.8, 1.2);
    this.scene.add(this.underLight);
  }

  /**
   * Build floating mounting collar. STRICTLY NO SHOULDERS OR CHEST.
   */
  private buildPedestal() {
    const collarGeo = new THREE.CylinderGeometry(0.85, 1.15, 0.35, 48);
    const collar = new THREE.Mesh(collarGeo, this.pedestalCollarMat);
    collar.position.y = -1.45;
    this.pedestalGroup.add(collar);

    const neonRingGeo = new THREE.TorusGeometry(0.92, 0.022, 16, 64);
    const neonRing = new THREE.Mesh(neonRingGeo, this.pedestalNeonMat);
    neonRing.rotation.x = Math.PI / 2;
    neonRing.position.y = -1.35;
    this.pedestalGroup.add(neonRing);

    const ringGeo = new THREE.RingGeometry(1.2, 1.32, 64);
    const holoRing = new THREE.Mesh(ringGeo, this.haloMat);
    holoRing.rotation.x = Math.PI / 2;
    holoRing.position.y = -1.42;
    this.pedestalGroup.add(holoRing);

    const bevelGeo = new THREE.TorusGeometry(1.15, 0.04, 16, 48);
    const bevelRing = new THREE.Mesh(bevelGeo, this.titaniumFrameMat);
    bevelRing.rotation.x = Math.PI / 2;
    bevelRing.position.y = -1.6;
    this.pedestalGroup.add(bevelRing);
  }

  /**
   * Articulated cervical vertebrae column (C1-C5) and telescoping pistons.
   */
  private buildNeckMechanics() {
    this.neckGroup.position.set(0, -0.7, 0);

    const vertebraMat = new THREE.MeshStandardMaterial({
      color: 0x182030,
      metalness: 0.9,
      roughness: 0.25,
    });

    const vertebraCount = 5;
    for (let i = 0; i < vertebraCount; i++) {
      const vY = -0.55 + i * 0.22;
      const radius = 0.34 - i * 0.02;

      const vGeo = new THREE.CylinderGeometry(radius, radius * 1.06, 0.12, 32);
      const vertebra = new THREE.Mesh(vGeo, vertebraMat);
      vertebra.position.set(0, vY, -0.06);
      this.neckGroup.add(vertebra);
      this.vertebraeMeshes.push(vertebra);

      // Glowing inter-vertebral disc spacer
      const sGeo = new THREE.CylinderGeometry(radius * 0.92, radius * 0.92, 0.035, 32);
      const spacer = new THREE.Mesh(sGeo, this.glowMaterial);
      spacer.position.set(0, vY + 0.07, -0.06);
      this.neckGroup.add(spacer);
      this.neckSpacerMeshes.push(spacer);
    }

    // Cylinders & Rods
    const cylMat = new THREE.MeshStandardMaterial({
      color: 0x111827,
      metalness: 0.95,
      roughness: 0.15,
    });
    const rodMat = new THREE.MeshStandardMaterial({
      color: 0xf3f4f6,
      metalness: 0.98,
      roughness: 0.05,
    });

    const cylGeo = new THREE.CylinderGeometry(0.06, 0.065, 0.65, 16);
    this.leftPistonCylinder = new THREE.Mesh(cylGeo, cylMat);
    this.leftPistonCylinder.position.set(-0.48, -0.32, -0.05);
    this.leftPistonCylinder.rotation.z = 0.08;
    this.neckGroup.add(this.leftPistonCylinder);

    const rodGeo = new THREE.CylinderGeometry(0.035, 0.035, 0.55, 16);
    this.leftPistonRod = new THREE.Mesh(rodGeo, rodMat);
    this.leftPistonRod.position.set(-0.48, 0.02, -0.05);
    this.leftPistonRod.rotation.z = 0.08;
    this.neckGroup.add(this.leftPistonRod);

    this.rightPistonCylinder = new THREE.Mesh(cylGeo, cylMat);
    this.rightPistonCylinder.position.set(0.48, -0.32, -0.05);
    this.rightPistonCylinder.rotation.z = -0.08;
    this.neckGroup.add(this.rightPistonCylinder);

    this.rightPistonRod = new THREE.Mesh(rodGeo, rodMat);
    this.rightPistonRod.position.set(0.48, 0.02, -0.05);
    this.rightPistonRod.rotation.z = -0.08;
    this.neckGroup.add(this.rightPistonRod);

    // Conduit cables
    const conduitCurveL = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.25, -0.65, -0.2),
      new THREE.Vector3(-0.28, -0.3, -0.15),
      new THREE.Vector3(-0.22, 0.15, -0.1),
    ]);
    const conduitGeoL = new THREE.TubeGeometry(conduitCurveL, 20, 0.016, 8, false);
    const conduitMeshL = new THREE.Mesh(conduitGeoL, this.glowMaterial);
    this.neckGroup.add(conduitMeshL);

    const conduitCurveR = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.25, -0.65, -0.2),
      new THREE.Vector3(0.28, -0.3, -0.15),
      new THREE.Vector3(0.22, 0.15, -0.1),
    ]);
    const conduitGeoR = new THREE.TubeGeometry(conduitCurveR, 20, 0.016, 8, false);
    const conduitMeshR = new THREE.Mesh(conduitGeoR, this.glowMaterial);
    this.neckGroup.add(conduitMeshR);
  }

  /**
   * Beautiful robot doll facial proportions:
   * Smooth porcelain doll cheeks, sweet tapered jawline, cute sculpted nose.
   */
  private buildCraniumAndFace() {
    this.headGroup.position.set(0, 0.25, 0);

    // Cranial Dome (Rear & Top)
    const craniumGeo = new THREE.SphereGeometry(
      0.87,
      48,
      36,
      0,
      Math.PI * 2,
      0,
      Math.PI * 0.72
    );
    craniumGeo.scale(0.92, 1.04, 1.04);
    const craniumMesh = new THREE.Mesh(craniumGeo, this.obsidianShellMat);
    craniumMesh.position.set(0, 0.12, -0.14);
    this.headGroup.add(craniumMesh);

    // Cranial crest / central division
    const crestGeo = new THREE.BoxGeometry(0.08, 1.05, 0.82);
    const crestMesh = new THREE.Mesh(crestGeo, this.dermalPlateMat);
    crestMesh.position.set(0, 0.52, -0.18);
    this.headGroup.add(crestMesh);

    // Forehead Plate - Smooth feminine curve
    const foreheadGeo = new THREE.SphereGeometry(
      0.82,
      32,
      24,
      Math.PI * 0.15,
      Math.PI * 0.7,
      0.2,
      Math.PI * 0.38
    );
    foreheadGeo.scale(0.9, 0.95, 0.98);
    const foreheadMesh = new THREE.Mesh(foreheadGeo, this.dermalPlateMat);
    foreheadMesh.position.set(0, 0.12, 0.02);
    this.headGroup.add(foreheadMesh);

    // Brow ridge - softer, delicate doll contour
    const browRidgeGeo = new THREE.BoxGeometry(0.82, 0.08, 0.14);
    const browRidge = new THREE.Mesh(browRidgeGeo, this.dermalPlateMat);
    browRidge.position.set(0, 0.28, 0.65);
    this.headGroup.add(browRidge);

    // Doll Cheekbones - Rounded, delicate doll cheeks with porcelain curve
    const cheekGeo = new THREE.SphereGeometry(0.28, 24, 20);
    cheekGeo.scale(0.8, 1.1, 0.65);

    const leftCheek = new THREE.Mesh(cheekGeo, this.dermalPlateMat);
    leftCheek.position.set(-0.44, -0.04, 0.48);
    leftCheek.rotation.set(0.12, 0.22, -0.1);
    this.headGroup.add(leftCheek);

    const rightCheek = new THREE.Mesh(cheekGeo, this.dermalPlateMat);
    rightCheek.position.set(0.44, -0.04, 0.48);
    rightCheek.rotation.set(0.12, -0.22, 0.1);
    this.headGroup.add(rightCheek);

    // Cute Doll Nose - Dainty, upturned, sleek robotic nose
    const noseGeo = new THREE.ConeGeometry(0.085, 0.38, 5);
    noseGeo.scale(0.8, 1.0, 1.3);
    const noseMesh = new THREE.Mesh(noseGeo, this.dermalPlateMat);
    noseMesh.position.set(0, 0.06, 0.76);
    noseMesh.rotation.x = -0.26;
    this.headGroup.add(noseMesh);

    // Dainty nose tip sphere
    const noseTipGeo = new THREE.SphereGeometry(0.042, 16, 16);
    const noseTip = new THREE.Mesh(noseTipGeo, this.dermalPlateMat);
    noseTip.position.set(0, -0.07, 0.81);
    this.headGroup.add(noseTip);

    // Upper Lip / Cupid's bow philtrum (anchored to upper head)
    const upperLipGeo = new THREE.BoxGeometry(0.3, 0.075, 0.12);
    const upperLipMesh = new THREE.Mesh(upperLipGeo, this.lipMat);
    upperLipMesh.position.set(0, -0.22, 0.7);
    this.headGroup.add(upperLipMesh);

    // Cupid's bow central peak
    const bowGeo = new THREE.ConeGeometry(0.045, 0.04, 4);
    bowGeo.rotateZ(Math.PI);
    const bowMesh = new THREE.Mesh(bowGeo, this.lipMat);
    bowMesh.position.set(0, -0.195, 0.72);
    this.headGroup.add(bowMesh);

    // Temple Ear Nodes (Left & Right)
    const earGeo = new THREE.CylinderGeometry(0.18, 0.2, 0.14, 32);
    earGeo.rotateZ(Math.PI / 2);

    const leftEar = new THREE.Mesh(earGeo, this.titaniumFrameMat);
    leftEar.position.set(-0.84, 0.15, -0.05);
    this.headGroup.add(leftEar);

    const leftEarRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.15, 0.016, 16, 32),
      this.glowMaterial
    );
    leftEarRing.rotation.y = Math.PI / 2;
    leftEarRing.position.set(-0.92, 0.15, -0.05);
    this.headGroup.add(leftEarRing);

    const rightEar = new THREE.Mesh(earGeo, this.titaniumFrameMat);
    rightEar.position.set(0.84, 0.15, -0.05);
    this.headGroup.add(rightEar);

    const rightEarRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.15, 0.016, 16, 32),
      this.glowMaterial
    );
    rightEarRing.rotation.y = Math.PI / 2;
    rightEarRing.position.set(0.92, 0.15, -0.05);
    this.headGroup.add(rightEarRing);

    // Glowing Temple telemetry seam lines
    const seamPointsL = [
      new THREE.Vector3(-0.35, 0.22, 0.65),
      new THREE.Vector3(-0.62, 0.12, 0.45),
      new THREE.Vector3(-0.72, -0.08, 0.28),
    ];
    const seamGeoL = new THREE.BufferGeometry().setFromPoints(seamPointsL);
    this.seamLineL = new THREE.Line(
      seamGeoL,
      new THREE.LineBasicMaterial({ color: 0xff2a85, linewidth: 2 })
    );
    this.headGroup.add(this.seamLineL);

    const seamPointsR = [
      new THREE.Vector3(0.35, 0.22, 0.65),
      new THREE.Vector3(0.62, 0.12, 0.45),
      new THREE.Vector3(0.72, -0.08, 0.28),
    ];
    const seamGeoR = new THREE.BufferGeometry().setFromPoints(seamPointsR);
    this.seamLineR = new THREE.Line(
      seamGeoR,
      new THREE.LineBasicMaterial({ color: 0xff2a85, linewidth: 2 })
    );
    this.headGroup.add(this.seamLineR);

    // Rear cranial cooling louvers
    for (let i = 0; i < 4; i++) {
      const louverGeo = new THREE.BoxGeometry(0.55, 0.03, 0.08);
      const louver = new THREE.Mesh(louverGeo, this.glowMaterial);
      louver.position.set(0, 0.38 - i * 0.12, -0.92);
      this.headGroup.add(louver);
    }
  }

  /**
   * Beautiful Doll Eyes & Long Curved Doll Eyelashes!
   * The eyelashes rotate directly with the upper eyelid for realistic doll blinking.
   */
  private buildEyesAndLashes() {
    const eyeSpacing = 0.29;
    const eyeY = 0.18;
    const eyeZ = 0.64;

    // Sclera Material (gleaming pearl white)
    const scleraMat = new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      metalness: 0.35,
      roughness: 0.12,
    });

    // Pupil Material
    const pupilMat = new THREE.MeshStandardMaterial({
      color: 0x020617,
      metalness: 0.95,
      roughness: 0.05,
    });

    // Cornea Dome (crystal gloss)
    const corneaMat = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      transmission: 0.9,
      opacity: 1,
      transparent: true,
      roughness: 0.02,
      ior: 1.45,
    });

    // Helper to create an eye
    const createEye = (isRight: boolean) => {
      const eyeGroup = new THREE.Group();
      eyeGroup.position.set(isRight ? eyeSpacing : -eyeSpacing, eyeY, eyeZ);

      // Sclera sphere
      const scleraGeo = new THREE.SphereGeometry(0.145, 32, 24);
      const sclera = new THREE.Mesh(scleraGeo, scleraMat);
      eyeGroup.add(sclera);

      // Iris disc
      const irisGeo = new THREE.RingGeometry(0.045, 0.11, 32);
      const iris = new THREE.Mesh(irisGeo, this.irisMat);
      iris.position.set(0, 0, 0.138);
      eyeGroup.add(iris);

      // Inner aperture ring
      const innerApertureGeo = new THREE.RingGeometry(0.038, 0.056, 24);
      const innerAperture = new THREE.Mesh(innerApertureGeo, this.innerApertureMat);
      innerAperture.position.set(0, 0, 0.14);
      eyeGroup.add(innerAperture);

      // Pupil disc
      const pupilGeo = new THREE.CircleGeometry(0.042, 24);
      const pupil = new THREE.Mesh(pupilGeo, pupilMat);
      pupil.position.set(0, 0, 0.142);
      eyeGroup.add(pupil);

      // Cornea dome
      const corneaGeo = new THREE.SphereGeometry(0.15, 32, 16, 0, Math.PI * 2, 0, 0.8);
      const cornea = new THREE.Mesh(corneaGeo, corneaMat);
      cornea.position.set(0, 0, 0.03);
      eyeGroup.add(cornea);

      return { eyeGroup, pupil, iris, innerAperture };
    };

    const left = createEye(false);
    this.leftEyeGroup = left.eyeGroup;
    this.leftPupil = left.pupil;
    this.leftIrisMesh = left.iris;
    this.leftInnerIrisMesh = left.innerAperture;
    this.headGroup.add(this.leftEyeGroup);

    const right = createEye(true);
    this.rightEyeGroup = right.eyeGroup;
    this.rightPupil = right.pupil;
    this.rightIrisMesh = right.iris;
    this.rightInnerIrisMesh = right.innerAperture;
    this.headGroup.add(this.rightEyeGroup);

    // Eyelids with Beautiful Doll Eyelashes
    const eyelidMat = new THREE.MeshStandardMaterial({
      color: 0x182030,
      metalness: 0.85,
      roughness: 0.25,
    });

    const createEyelidsWithLashes = (isRight: boolean) => {
      const eyelidGroup = new THREE.Group();
      eyelidGroup.position.set(isRight ? eyeSpacing : -eyeSpacing, eyeY, eyeZ);

      // Upper eyelid
      const upperGeo = new THREE.SphereGeometry(
        0.155,
        32,
        16,
        0,
        Math.PI * 2,
        0,
        Math.PI * 0.48
      );
      const upperLid = new THREE.Mesh(upperGeo, eyelidMat);
      upperLid.rotation.x = -Math.PI * 0.48; // Open position
      eyelidGroup.add(upperLid);

      // Doll Eyelashes attached directly to upper eyelid!
      const lashCount = 6;
      for (let i = 0; i < lashCount; i++) {
        const t = i / (lashCount - 1); // 0 to 1 across the lid
        const angle = -0.55 + t * 1.1; // sweep along eye curve
        const lashLength = 0.06 + Math.sin(t * Math.PI) * 0.045; // Longer in center/outer

        // Curved cylinder eyelash
        const lashGeo = new THREE.CylinderGeometry(0.0035, 0.001, lashLength, 8);
        const lashMesh = new THREE.Mesh(lashGeo, this.eyelashMat);

        // Position on the edge of the upper eyelid rim
        const lashX = Math.sin(angle) * 0.145;
        const lashY = Math.cos(angle) * 0.055 + 0.08;
        const lashZ = 0.12;

        lashMesh.position.set(lashX, lashY, lashZ);
        lashMesh.rotation.z = -angle * 0.8;
        lashMesh.rotation.x = 0.45; // Curved forward and slightly up
        upperLid.add(lashMesh);
      }

      // Lower eyelid
      const lowerGeo = new THREE.SphereGeometry(
        0.155,
        32,
        16,
        0,
        Math.PI * 2,
        Math.PI * 0.52,
        Math.PI * 0.48
      );
      const lowerLid = new THREE.Mesh(lowerGeo, eyelidMat);
      lowerLid.rotation.x = Math.PI * 0.48; // Open position
      eyelidGroup.add(lowerLid);

      return { upperLid, lowerLid, eyelidGroup };
    };

    const lidsL = createEyelidsWithLashes(false);
    this.leftUpperEyelid = lidsL.upperLid;
    this.leftLowerEyelid = lidsL.lowerLid;
    this.headGroup.add(lidsL.eyelidGroup);

    const lidsR = createEyelidsWithLashes(true);
    this.rightUpperEyelid = lidsR.upperLid;
    this.rightLowerEyelid = lidsR.lowerLid;
    this.headGroup.add(lidsR.eyelidGroup);

    // Arched Doll Eyebrows (delicate curved actuators)
    const browGeo = new THREE.BoxGeometry(0.28, 0.035, 0.045);
    this.leftBrowMesh = new THREE.Mesh(browGeo, this.browMat);
    this.leftBrowMesh.position.set(-eyeSpacing, eyeY + 0.17, eyeZ + 0.08);
    this.leftBrowMesh.rotation.z = 0.06;
    this.headGroup.add(this.leftBrowMesh);

    this.rightBrowMesh = new THREE.Mesh(browGeo, this.browMat);
    this.rightBrowMesh.position.set(eyeSpacing, eyeY + 0.17, eyeZ + 0.08);
    this.rightBrowMesh.rotation.z = -0.06;
    this.headGroup.add(this.rightBrowMesh);
  }

  /**
   * Articulated jaw, glossy doll lips, and inner acoustic grille.
   */
  private buildJawAndDollLips() {
    this.jawGroup.position.set(0, -0.15, 0.15);

    // Tapered, graceful doll chin
    const chinGeo = new THREE.CylinderGeometry(0.2, 0.13, 0.38, 20);
    chinGeo.scale(0.9, 1.0, 1.15);
    const chinMesh = new THREE.Mesh(chinGeo, this.dermalPlateMat);
    chinMesh.position.set(0, -0.31, 0.46);
    chinMesh.rotation.x = 0.22;
    this.jawGroup.add(chinMesh);

    // Plump glossy doll lower lip
    const lowerLipGeo = new THREE.BoxGeometry(0.28, 0.095, 0.13);
    const lowerLip = new THREE.Mesh(lowerLipGeo, this.lipMat);
    lowerLip.position.set(0, -0.14, 0.54);
    this.jawGroup.add(lowerLip);

    // Hinge cylinders
    const hingeGeo = new THREE.CylinderGeometry(0.065, 0.065, 0.12, 16);
    hingeGeo.rotateZ(Math.PI / 2);
    const hingeMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      metalness: 0.95,
      roughness: 0.1,
    });

    const leftHinge = new THREE.Mesh(hingeGeo, hingeMat);
    leftHinge.position.set(-0.5, 0, 0);
    this.jawGroup.add(leftHinge);

    const rightHinge = new THREE.Mesh(hingeGeo, hingeMat);
    rightHinge.position.set(0.5, 0, 0);
    this.jawGroup.add(rightHinge);

    // Inner vocalizer grille & acoustic LED light
    const vocalizerGeo = new THREE.PlaneGeometry(0.24, 0.09);
    const vocalizerMat = new THREE.MeshBasicMaterial({
      color: 0x00e5ff,
      wireframe: true,
    });
    this.vocalizerMesh = new THREE.Mesh(vocalizerGeo, vocalizerMat);
    this.vocalizerMesh.position.set(0, -0.06, 0.48);
    this.jawGroup.add(this.vocalizerMesh);

    this.vocalizerLight = new THREE.PointLight(0xff2a85, 0, 1.5);
    this.vocalizerLight.position.set(0, -0.06, 0.52);
    this.jawGroup.add(this.vocalizerLight);
  }

  /**
   * BARBIE: Glamour Platinum Cyber-Locks & Rose Gold Tiara Headband
   */
  private buildBarbieDollHair() {
    const hairMat = new THREE.MeshStandardMaterial({
      color: 0xfef08a, // Platinum blonde metallic sheen
      metalness: 0.45,
      roughness: 0.28,
    });

    const tiaraMat = new THREE.MeshStandardMaterial({
      color: 0xf472b6, // Rose gold chrome
      metalness: 0.95,
      roughness: 0.12,
    });

    // Cranial hair cap (sleek sculpted shell)
    const hairCapGeo = new THREE.SphereGeometry(0.9, 32, 24, 0, Math.PI * 2, 0, Math.PI * 0.5);
    hairCapGeo.scale(0.94, 1.08, 1.05);
    const hairCap = new THREE.Mesh(hairCapGeo, hairMat);
    hairCap.position.set(0, 0.14, -0.12);
    this.barbieHairGroup.add(hairCap);

    // Stylish side-swept front bangs
    const bangCurveL = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.02, 0.52, 0.62),
      new THREE.Vector3(-0.25, 0.42, 0.68),
      new THREE.Vector3(-0.48, 0.28, 0.62),
    ]);
    const bangGeoL = new THREE.TubeGeometry(bangCurveL, 16, 0.045, 8, false);
    const bangMeshL = new THREE.Mesh(bangGeoL, hairMat);
    this.barbieHairGroup.add(bangMeshL);

    const bangCurveR = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.02, 0.52, 0.62),
      new THREE.Vector3(0.28, 0.38, 0.68),
      new THREE.Vector3(0.52, 0.22, 0.58),
    ]);
    const bangGeoR = new THREE.TubeGeometry(bangCurveR, 16, 0.045, 8, false);
    const bangMeshR = new THREE.Mesh(bangGeoR, hairMat);
    this.barbieHairGroup.add(bangMeshR);

    // Twin cyber tendrils framing temples & neck (STRICTLY head & neck only)
    const tendrilCurveL = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.55, 0.25, 0.4),
      new THREE.Vector3(-0.62, -0.05, 0.3),
      new THREE.Vector3(-0.52, -0.35, 0.15),
    ]);
    const tendrilGeoL = new THREE.TubeGeometry(tendrilCurveL, 20, 0.038, 8, false);
    const tendrilL = new THREE.Mesh(tendrilGeoL, hairMat);
    this.barbieHairGroup.add(tendrilL);

    const tendrilCurveR = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.55, 0.25, 0.4),
      new THREE.Vector3(0.62, -0.05, 0.3),
      new THREE.Vector3(0.52, -0.35, 0.15),
    ]);
    const tendrilGeoR = new THREE.TubeGeometry(tendrilCurveR, 20, 0.038, 8, false);
    const tendrilR = new THREE.Mesh(tendrilGeoR, hairMat);
    this.barbieHairGroup.add(tendrilR);

    // Glamorous Top Cyber Bun Node
    const bunGeo = new THREE.SphereGeometry(0.32, 24, 20);
    bunGeo.scale(1.1, 0.85, 1.0);
    const bun = new THREE.Mesh(bunGeo, hairMat);
    bun.position.set(0, 0.98, -0.2);
    this.barbieHairGroup.add(bun);

    // Rose-Gold Cyber Tiara Headband
    const tiaraGeo = new THREE.TorusGeometry(0.86, 0.024, 16, 48, Math.PI * 0.9);
    const tiara = new THREE.Mesh(tiaraGeo, tiaraMat);
    tiara.position.set(0, 0.46, 0.12);
    tiara.rotation.x = Math.PI * 0.65;
    this.barbieHairGroup.add(tiara);

    // Tiara center crystal node
    const gemGeo = new THREE.OctahedronGeometry(0.048);
    const gemMat = new THREE.MeshStandardMaterial({
      color: 0xff007f,
      emissive: 0xff007f,
      emissiveIntensity: 2.2,
      roughness: 0.1,
    });
    const gem = new THREE.Mesh(gemGeo, gemMat);
    gem.position.set(0, 0.54, 0.68);
    this.barbieHairGroup.add(gem);
  }

  /**
   * MOANA: Sculpted Oceanic Dark Cyber-Wave Locks & Tropical Titanium Floral Ear Node
   */
  private buildMoanaDollHair() {
    const hairMat = new THREE.MeshStandardMaterial({
      color: 0x1f140c, // Rich dark espresso bronze cyber hair
      metalness: 0.35,
      roughness: 0.35,
    });

    const conduitStrandMat = new THREE.MeshStandardMaterial({
      color: 0x06b6d4, // Glowing oceanic turquoise strand
      emissive: 0x0891b2,
      emissiveIntensity: 1.8,
    });

    // Wave hair cap
    const hairCapGeo = new THREE.SphereGeometry(0.92, 32, 24, 0, Math.PI * 2, 0, Math.PI * 0.55);
    hairCapGeo.scale(0.95, 1.06, 1.06);
    const hairCap = new THREE.Mesh(hairCapGeo, hairMat);
    hairCap.position.set(0, 0.15, -0.1);
    this.moanaHairGroup.add(hairCap);

    // Oceanic wave locks cascading around cranium and upper neck
    const waveCurves = [
      // Left wave lock
      [
        new THREE.Vector3(-0.35, 0.45, 0.5),
        new THREE.Vector3(-0.55, 0.2, 0.42),
        new THREE.Vector3(-0.62, -0.15, 0.28),
        new THREE.Vector3(-0.52, -0.42, 0.12),
      ],
      // Right wave lock
      [
        new THREE.Vector3(0.35, 0.45, 0.5),
        new THREE.Vector3(0.55, 0.2, 0.42),
        new THREE.Vector3(0.62, -0.15, 0.28),
        new THREE.Vector3(0.52, -0.42, 0.12),
      ],
      // Rear wave tresses
      [
        new THREE.Vector3(-0.25, 0.3, -0.7),
        new THREE.Vector3(-0.32, -0.1, -0.65),
        new THREE.Vector3(-0.24, -0.45, -0.55),
      ],
      [
        new THREE.Vector3(0.25, 0.3, -0.7),
        new THREE.Vector3(0.32, -0.1, -0.65),
        new THREE.Vector3(0.24, -0.45, -0.55),
      ],
    ];

    waveCurves.forEach((pts) => {
      const curve = new THREE.CatmullRomCurve3(pts);
      const geo = new THREE.TubeGeometry(curve, 20, 0.046, 8, false);
      const mesh = new THREE.Mesh(geo, hairMat);
      this.moanaHairGroup.add(mesh);
    });

    // Luminous turquoise cyber-strands woven in
    const glowStrandCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.32, 0.46, 0.52),
      new THREE.Vector3(-0.58, 0.12, 0.38),
      new THREE.Vector3(-0.5, -0.32, 0.2),
    ]);
    const glowStrandGeo = new THREE.TubeGeometry(glowStrandCurve, 20, 0.018, 6, false);
    const glowStrand = new THREE.Mesh(glowStrandGeo, conduitStrandMat);
    this.moanaHairGroup.add(glowStrand);

    // Tropical Titanium Plumeria / Hibiscus Flower Ear-Transducer Node
    const flowerGroup = new THREE.Group();
    flowerGroup.position.set(0.86, 0.26, 0.12);
    flowerGroup.rotation.y = Math.PI * 0.45;
    flowerGroup.rotation.z = -0.2;

    const petalMat = new THREE.MeshStandardMaterial({
      color: 0xf43f5e, // Coral hibiscus pink
      emissive: 0xe11d48,
      emissiveIntensity: 0.9,
      roughness: 0.3,
      metalness: 0.5,
    });
    const centerMat = new THREE.MeshStandardMaterial({
      color: 0xfbbf24, // Warm golden core
      emissive: 0xf59e0b,
      emissiveIntensity: 1.5,
      roughness: 0.2,
      metalness: 0.8,
    });

    // 5 Petals
    for (let p = 0; p < 5; p++) {
      const angle = (p / 5) * Math.PI * 2;
      const petalGeo = new THREE.ConeGeometry(0.042, 0.14, 5);
      petalGeo.scale(1.2, 1.0, 0.4);
      const petal = new THREE.Mesh(petalGeo, petalMat);
      petal.position.set(Math.cos(angle) * 0.07, Math.sin(angle) * 0.07, 0);
      petal.rotation.z = angle - Math.PI / 2;
      flowerGroup.add(petal);
    }

    // Flower central acoustic core
    const coreGeo = new THREE.SphereGeometry(0.04, 16, 16);
    const core = new THREE.Mesh(coreGeo, centerMat);
    core.position.set(0, 0, 0.02);
    flowerGroup.add(core);

    this.moanaHairGroup.add(flowerGroup);
  }

  /**
   * IRIS: Sleek Cyberpunk Platinum-Silver Bob & Cyan Visor Band
   */
  private buildIrisDollHair() {
    const hairMat = new THREE.MeshStandardMaterial({
      color: 0xcfd8dc, // Platinum silver metallic cyber-bob
      metalness: 0.85,
      roughness: 0.18,
    });

    const visorMat = new THREE.MeshStandardMaterial({
      color: 0x00f0ff, // Electric cyan neon visor band
      emissive: 0x00d8ff,
      emissiveIntensity: 2.2,
      roughness: 0.1,
    });

    // Geometric cyber-bob helmet/hair plates
    const bobGeo = new THREE.SphereGeometry(0.9, 32, 24, 0, Math.PI * 2, 0, Math.PI * 0.58);
    bobGeo.scale(0.96, 1.05, 1.04);
    const bob = new THREE.Mesh(bobGeo, hairMat);
    bob.position.set(0, 0.14, -0.12);
    this.irisHairGroup.add(bob);

    // Sharp angled geometric hair blades on Left & Right
    const bladeGeo = new THREE.BoxGeometry(0.12, 0.58, 0.35);
    const leftBlade = new THREE.Mesh(bladeGeo, hairMat);
    leftBlade.position.set(-0.62, 0.02, 0.22);
    leftBlade.rotation.set(0.1, 0.15, -0.22);
    this.irisHairGroup.add(leftBlade);

    const rightBlade = new THREE.Mesh(bladeGeo, hairMat);
    rightBlade.position.set(0.62, 0.02, 0.22);
    rightBlade.rotation.set(0.1, -0.15, 0.22);
    this.irisHairGroup.add(rightBlade);

    // High-tech Cyber Visor Band
    const visorGeo = new THREE.TorusGeometry(0.88, 0.022, 16, 48, Math.PI * 0.85);
    const visor = new THREE.Mesh(visorGeo, visorMat);
    visor.position.set(0, 0.38, 0.14);
    visor.rotation.x = Math.PI * 0.58;
    this.irisHairGroup.add(visor);

    // Lateral optic nodes
    const nodeGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.06, 16);
    nodeGeo.rotateZ(Math.PI / 2);
    const nodeL = new THREE.Mesh(nodeGeo, visorMat);
    nodeL.position.set(-0.76, 0.36, 0.34);
    this.irisHairGroup.add(nodeL);

    const nodeR = new THREE.Mesh(nodeGeo, visorMat);
    nodeR.position.set(0.76, 0.36, 0.34);
    this.irisHairGroup.add(nodeR);
  }

  /**
   * Floating cyber telemetry halo and particles
   */
  private buildHolographicRings() {
    const haloGeo = new THREE.TorusGeometry(1.35, 0.008, 8, 80);
    const haloRing = new THREE.Mesh(haloGeo, this.haloMat);
    haloRing.rotation.x = Math.PI * 0.42;
    haloRing.rotation.y = Math.PI * 0.15;
    haloRing.position.set(0, 0.28, 0);
    this.rootGroup.add(haloRing);

    const particleCount = 50;
    const particleGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount * 3; i += 3) {
      const theta = Math.random() * Math.PI * 2;
      const radius = 1.1 + Math.random() * 0.7;
      const y = -0.8 + Math.random() * 2.2;
      positions[i] = Math.cos(theta) * radius;
      positions[i + 1] = y;
      positions[i + 2] = Math.sin(theta) * radius;
    }

    particleGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const particleMat = new THREE.PointsMaterial({
      color: 0x00d8ff,
      size: 0.026,
      transparent: true,
      opacity: 0.65,
    });
    const particles = new THREE.Points(particleGeo, particleMat);
    this.rootGroup.add(particles);
  }

  /**
   * Dynamically switches the active robot doll persona, updating geometry,
   * hair sculpts, and materials seamlessly!
   */
  public setDoll(doll: RobotDollName) {
    if (this.currentDoll === doll) return;
    this.currentDoll = doll;
    this.applyDollProfile(doll);
  }

  private applyDollProfile(doll: RobotDollName) {
    const profile = DOLL_PROFILES[doll];

    // Toggle active hairstyle groups
    this.barbieHairGroup.visible = doll === "Barbie";
    this.moanaHairGroup.visible = doll === "Moana";
    this.irisHairGroup.visible = doll === "Iris";

    // Update material properties
    this.dermalPlateMat.color.setHex(profile.dermalColor);
    this.dermalPlateMat.roughness = profile.dermalRoughness;
    this.dermalPlateMat.metalness = profile.dermalMetalness;

    this.obsidianShellMat.color.setHex(profile.shellColor);
    this.titaniumFrameMat.color.setHex(profile.trimColor);

    this.glowMaterial.color.setHex(profile.glowColor);
    this.glowMaterial.emissive.setHex(profile.glowEmissive);

    this.pedestalNeonMat.color.setHex(profile.glowColor);
    this.pedestalNeonMat.emissive.setHex(profile.glowEmissive);

    this.haloMat.color.setHex(profile.glowColor);

    this.irisMat.color.setHex(profile.irisColor);
    this.irisMat.emissive.setHex(profile.irisColor);

    this.innerApertureMat.color.setHex(profile.innerIrisColor);

    this.lipMat.color.setHex(profile.lipColor);
    this.browMat.color.setHex(profile.eyebrowColor);

    // Update seam lines color
    if (this.seamLineL) {
      (this.seamLineL.material as THREE.LineBasicMaterial).color.setHex(profile.glowColor);
    }
    if (this.seamLineR) {
      (this.seamLineR.material as THREE.LineBasicMaterial).color.setHex(profile.glowColor);
    }

    // Dynamic scene lighting tint
    if (this.rimLight) {
      this.rimLight.color.setHex(profile.glowColor);
    }
    if (this.underLight) {
      this.underLight.color.setHex(profile.lipColor);
    }
    if (this.vocalizerLight) {
      this.vocalizerLight.color.setHex(profile.glowColor);
    }
  }

  private bindEvents() {
    window.addEventListener("resize", this.handleResize);
    this.container.addEventListener("pointerdown", this.handlePointerDown);
    window.addEventListener("pointermove", this.handlePointerMove);
    window.addEventListener("pointerup", this.handlePointerUp);
    this.container.addEventListener("wheel", this.handleWheel, { passive: false });
  }

  private handleResize = () => {
    if (!this.container) return;
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  };

  private handlePointerDown = (e: PointerEvent) => {
    if (e.button !== 0) return;
    this.isDragging = true;
    this.prevPointerX = e.clientX;
    this.prevPointerY = e.clientY;
  };

  private handlePointerMove = (e: PointerEvent) => {
    const rect = this.container.getBoundingClientRect();
    const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const ny = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
    this.targetLook.x = THREE.MathUtils.clamp(nx * 1.2, -1, 1);
    this.targetLook.y = THREE.MathUtils.clamp(ny * 1.2, -1, 1);

    if (this.isDragging) {
      const deltaX = e.clientX - this.prevPointerX;
      const deltaY = e.clientY - this.prevPointerY;
      this.orbitAngleX += deltaX * 0.007;
      this.orbitAngleY = THREE.MathUtils.clamp(
        this.orbitAngleY + deltaY * 0.007,
        -0.65,
        0.75
      );
      this.prevPointerX = e.clientX;
      this.prevPointerY = e.clientY;
    }
  };

  private handlePointerUp = () => {
    this.isDragging = false;
  };

  private handleWheel = (e: WheelEvent) => {
    e.preventDefault();
    this.cameraDistance = THREE.MathUtils.clamp(
      this.cameraDistance + e.deltaY * 0.0025,
      2.5,
      5.5
    );
  };

  private animate() {
    this.animFrameId = requestAnimationFrame(this.animate);
    const dt = 0.016;
    this.time += dt;

    // 1. Subtle rhythmic breathing motion in head & neck
    const breathSpeed = this.state === "speaking" ? 3.0 : 1.8;
    const breathPitch = Math.sin(this.time * breathSpeed) * 0.024;
    const breathNeckY = Math.sin(this.time * breathSpeed) * 0.012;
    const microYaw = Math.sin(this.time * 0.7) * 0.02;
    const microRoll = Math.cos(this.time * 0.85) * 0.015;

    // 2. Affective Expression & State Modulation
    let targetPitch = breathPitch;
    let targetYaw = microYaw;
    let targetRoll = microRoll;
    let pupilScale = 1.0;
    let browL = 0;
    let browR = 0;

    switch (this.state) {
      case "listening":
        targetPitch += 0.06; // Lean forward attentively
        targetRoll += 0.04;
        pupilScale = 1.2;
        browL = 0.08;
        browR = 0.08;
        break;
      case "thinking":
        targetPitch -= 0.08; // Tilt back in reflection
        targetYaw += 0.12;
        pupilScale = 0.88;
        browL = -0.12;
        browR = 0.06;
        break;
      case "speaking":
        const cadence = Math.sin(this.time * 8.5) * (this.lipSync.volume * 0.08);
        targetPitch += cadence;
        targetYaw += Math.cos(this.time * 4.2) * (this.lipSync.volume * 0.05);
        pupilScale = 1.05 + this.lipSync.volume * 0.15;
        break;
    }

    switch (this.expression) {
      case "warm":
      case "pleased":
        targetRoll += 0.05;
        browL += 0.1;
        browR += 0.1;
        break;
      case "curious":
        targetRoll -= 0.1;
        targetPitch += 0.04;
        browL += 0.18;
        browR -= 0.06;
        break;
      case "analytical":
        browL -= 0.1;
        browR -= 0.1;
        pupilScale *= 0.92;
        break;
      case "attentive":
        pupilScale *= 1.15;
        break;
    }

    // Natural Gaze tracking
    let targetLookX = this.targetLook.x;
    let targetLookY = this.targetLook.y;

    if (this.state === "thinking") {
      targetLookX = 0.35;
      targetLookY = 0.45;
    }

    this.currentLook.x += (targetLookX - this.currentLook.x) * 0.08;
    this.currentLook.y += (targetLookY - this.currentLook.y) * 0.08;

    // Saccadic micro-shift
    if (Math.random() < 0.015 && this.state !== "thinking") {
      this.currentLook.x += (Math.random() - 0.5) * 0.08;
      this.currentLook.y += (Math.random() - 0.5) * 0.06;
    }

    // Blink timer
    this.blinkTimer += dt;
    if (!this.isBlinking && this.blinkTimer > 2.8 + Math.random() * 2.5) {
      this.isBlinking = true;
      this.blinkProgress = 0;
      this.blinkTimer = 0;
    }

    let blinkVal = 0;
    if (this.isBlinking) {
      this.blinkProgress += dt / this.blinkDuration;
      if (this.blinkProgress < 0.5) {
        blinkVal = this.blinkProgress * 2;
      } else if (this.blinkProgress < 1.0) {
        blinkVal = (1.0 - this.blinkProgress) * 2;
      } else {
        this.isBlinking = false;
        blinkVal = 0;
      }
    }

    // 3. Cervical Kinematics: Head & Neck
    this.currentHeadPose.pitch += (targetPitch - this.currentHeadPose.pitch) * 0.1;
    this.currentHeadPose.yaw += (targetYaw - this.currentHeadPose.yaw) * 0.1;
    this.currentHeadPose.roll += (targetRoll - this.currentHeadPose.roll) * 0.1;
    this.currentHeadPose.neckY += (breathNeckY - this.currentHeadPose.neckY) * 0.1;

    // Apply rotations
    this.headGroup.rotation.x = this.currentHeadPose.pitch;
    this.headGroup.rotation.y = this.currentHeadPose.yaw;
    this.headGroup.rotation.z = this.currentHeadPose.roll;

    // Neck vertebrae articulated distribution
    this.vertebraeMeshes.forEach((vMesh, idx) => {
      const factor = (idx + 1) / this.vertebraeMeshes.length;
      vMesh.rotation.x = this.currentHeadPose.pitch * factor * 0.35;
      vMesh.rotation.y = this.currentHeadPose.yaw * factor * 0.4;
      vMesh.rotation.z = this.currentHeadPose.roll * factor * 0.25;
      vMesh.position.y = -0.55 + idx * 0.22 + this.currentHeadPose.neckY * factor;
    });

    // Piston compression/extension
    const pistonLeftLength = 0.55 - this.currentHeadPose.roll * 0.3 + this.currentHeadPose.pitch * 0.15;
    const pistonRightLength = 0.55 + this.currentHeadPose.roll * 0.3 + this.currentHeadPose.pitch * 0.15;
    if (this.leftPistonRod) {
      this.leftPistonRod.position.y = -0.32 + pistonLeftLength * 0.5;
    }
    if (this.rightPistonRod) {
      this.rightPistonRod.position.y = -0.32 + pistonRightLength * 0.5;
    }

    // 4. Doll Eyes & Doll Eyelashes Animation
    const eyeRotX = -this.currentLook.y * 0.35;
    const eyeRotY = this.currentLook.x * 0.38;
    this.leftEyeGroup.rotation.set(eyeRotX, eyeRotY, 0);
    this.rightEyeGroup.rotation.set(eyeRotX, eyeRotY, 0);

    // Pupil dilation
    this.leftPupil.scale.set(pupilScale, pupilScale, 1);
    this.rightPupil.scale.set(pupilScale, pupilScale, 1);

    // Eyelid & Eyelashes rotation (sweeps eyelashes smoothly)
    const upperLidAngle = -Math.PI * 0.48 + blinkVal * (Math.PI * 0.46);
    const lowerLidAngle = Math.PI * 0.48 - blinkVal * (Math.PI * 0.22);
    this.leftUpperEyelid.rotation.x = upperLidAngle;
    this.rightUpperEyelid.rotation.x = upperLidAngle;
    this.leftLowerEyelid.rotation.x = lowerLidAngle;
    this.rightLowerEyelid.rotation.x = lowerLidAngle;

    // Eyebrows
    this.leftBrowMesh.rotation.z = 0.06 + browL;
    this.rightBrowMesh.rotation.z = -0.06 - browR;

    // 5. Articulated Robotic Jaw & Lip-Sync
    const targetJawAngle = this.lipSync.open * 0.26 + this.lipSync.volume * 0.12;
    this.jawGroup.rotation.x += (targetJawAngle - this.jawGroup.rotation.x) * 0.22;

    if (this.vocalizerLight) {
      this.vocalizerLight.intensity = this.lipSync.volume * 4.2;
    }
    if (this.vocalizerMesh) {
      this.vocalizerMesh.scale.x = 1 + this.lipSync.width * 0.3;
      this.vocalizerMesh.scale.y = 1 + this.lipSync.open * 0.6;
    }

    // 6. Camera Orbit Damping
    const camTargetX = Math.sin(this.orbitAngleX) * this.cameraDistance;
    const camTargetZ = Math.cos(this.orbitAngleX) * this.cameraDistance;
    const camTargetY = 0.25 + Math.sin(this.orbitAngleY) * 1.5;

    this.camera.position.x += (camTargetX - this.camera.position.x) * 0.08;
    this.camera.position.y += (camTargetY - this.camera.position.y) * 0.08;
    this.camera.position.z += (camTargetZ - this.camera.position.z) * 0.08;
    this.camera.lookAt(0, 0.15, 0);

    // 7. Pulse glow elements
    const glowPulse = 2.0 + Math.sin(this.time * 2.2) * 0.8;
    this.pulseGlowMaterials.forEach((mat) => {
      mat.emissiveIntensity = glowPulse;
    });

    this.renderer.render(this.scene, this.camera);
  }

  public resetOrbit() {
    this.orbitAngleX = 0;
    this.orbitAngleY = 0;
    this.cameraDistance = 3.8;
  }

  public destroy() {
    cancelAnimationFrame(this.animFrameId);
    window.removeEventListener("resize", this.handleResize);
    this.container.removeEventListener("pointerdown", this.handlePointerDown);
    window.removeEventListener("pointermove", this.handlePointerMove);
    window.removeEventListener("pointerup", this.handlePointerUp);
    this.container.removeEventListener("wheel", this.handleWheel);

    this.renderer.dispose();
    if (this.container.contains(this.renderer.domElement)) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}
