// FUNGSI PEMUAT LIBRARY THREE.JS + LOADER FILE 3D (.GLB, .GLTF, .OBJ, .STL)
function loadScript(src) {
    return new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = src;
        s.onload = () => resolve();
        s.onerror = () => reject(new Error(`Gagal memuat: ${src}`));
        document.head.appendChild(s);
    });
}

async function ensure3DEngineReady() {
    if (!window.THREE) {
        await loadScript('https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js');
    }
   const loaders = [
     'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/DRACOLoader.js',
     'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/GLTFLoader.js',
     'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/OBJLoader.js',
     'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/STLLoader.js'
 ];
    for (const url of loaders) {
        try {
            await loadScript(url);
        } catch (e) {
            console.warn(e.message);
        }
    }
}

async function initAirShaper3DFileStudio() {
    try {
        await ensure3DEngineReady();
    } catch (err) {
        console.error(err.message);
        return;
    }

    // 1. DATABASE 10 KENDARAAN (ISI 'modelUrl' DENGAN LINK RAW GITHUB .GLB ANDA)
    const vehicleDatabase = {
        motogp: {
            name: '01. MOTOR BALAP MOTOGP + PEMBALAP',
            modelUrl: '',
            targetSize: 3.35, defaultRotY: -Math.PI / 2,
            cd: 0.509, cl: -0.18, area: 0.58, tailX: 1.65, airborne: false
        },
        street_moto: {
            name: '02. MOTOR STREETFIGHTER / NAKED BIKE',
            modelUrl: '',
            targetSize: 3.25, defaultRotY: -Math.PI / 2,
            cd: 0.635, cl: 0.04, area: 0.72, tailX: 1.60, airborne: false
        },
        daily_car: {
            name: '03. MOBIL BIASA (SEDAN / HATCHBACK)',
            modelUrl: '',
            targetSize: 4.85, defaultRotY: -Math.PI / 2,
            cd: 0.285, cl: 0.06, area: 2.22, tailX: 2.40, airborne: false
        },
        gt3_race: {
            name: '04. MOBIL BALAP GT3 / LE MANS PROTOTYPE',
            modelUrl: '',
            targetSize: 4.95, defaultRotY: -Math.PI / 2,
            cd: 0.390, cl: -0.88, area: 2.05, tailX: 2.45, airborne: false
        },
        f1_car: {
            name: '05. MOBIL FORMULA 1',
            modelUrl: '',
            targetSize: 5.15, defaultRotY: -Math.PI / 2,
            cd: 0.720, cl: -2.45, area: 1.55, tailX: 2.55, airborne: false
        },
        fighter_jet: {
            name: '06. PESAWAT TEMPUR SUPERSONIK',
            modelUrl: '',
            targetSize: 5.30, defaultRotY: -Math.PI / 2,
            cd: 0.092, cl: 0.46, area: 3.10, tailX: 2.65, airborne: true
        },
        airliner: {
            name: '07. PESAWAT KOMERSIAL PENUMPANG',
            modelUrl: '',
            targetSize: 5.50, defaultRotY: -Math.PI / 2,
            cd: 0.084, cl: 0.64, area: 12.50, tailX: 2.75, airborne: true
        },
        hypercar: {
            name: '08. HYPERCAR STREAMLINE',
            modelUrl: '',
            targetSize: 4.90, defaultRotY: -Math.PI / 2,
            cd: 0.238, cl: -0.68, area: 1.88, tailX: 2.42, airborne: false
        },
        semi_truck: {
            name: '09. TRUK KONTAINER HEAVY-DUTY',
            modelUrl: '',
            targetSize: 5.35, defaultRotY: -Math.PI / 2,
            cd: 0.480, cl: 0.08, area: 8.60, tailX: 2.68, airborne: false
        },
        bullet_train: {
            name: '10. KERETA CEPAT PELURU (SHINKANSEN)',
            modelUrl: '',
            targetSize: 5.50, defaultRotY: -Math.PI / 2,
            cd: 0.158, cl: -0.05, area: 9.40, tailX: 2.75, airborne: false
        }
    };

    // 2. INISIALISASI WADAH & ELEMEN UI
    let container = document.getElementById('aero3dContainer');
    if (!container) {
        const fallbackBox = document.querySelector('.canvas-box') || document.getElementById('kalkulator');
        if (!fallbackBox) return;
        container = document.createElement('div');
        container.id = 'aero3dContainer';
        fallbackBox.appendChild(container);
    }
    container.style.position = 'relative';
    container.style.width = '100%';
    container.style.height = '460px';
    container.style.backgroundColor = '#050608';
    container.style.cursor = 'grab';
    container.innerHTML = '';

    const modelStatusTag = document.createElement('div');
    modelStatusTag.style.cssText = 'position:absolute;top:12px;left:12px;background:rgba(10,12,18,0.84);backdrop-filter:blur(6px);padding:5px 11px;border-radius:6px;font-family:"JetBrains Mono",monospace;font-size:11px;color:#d2ff00;z-index:10;border:1px solid rgba(210,255,0,0.35);pointer-events:none;';
    modelStatusTag.textContent = '3D MESH: READY (UPLOAD .GLB/.OBJ/.STL ATAU ISI URL GITHUB)';
    container.appendChild(modelStatusTag);

    // Tombol Toggle Mode Kepadatan Asap di Pojok Kanan Atas Viewport
    const smokeModes = [
        { label: '💨 ASAP: REALISTIS (SILKY + VORTEX)', density: 1.0, stretch: 1.0 },
        { label: '💨 ASAP: KABUT TEBAL (WIND TUNNEL)', density: 1.48, stretch: 1.25 },
        { label: '💨 ASAP: SERAT HALUS (STREAMLINE)', density: 0.72, stretch: 1.55 }
    ];
    let currentSmokeModeIdx = 0;

    const smokeModeBtn = document.createElement('button');
    smokeModeBtn.type = 'button';
    smokeModeBtn.textContent = smokeModes[0].label;
    smokeModeBtn.style.cssText = 'position:absolute;top:12px;right:12px;background:rgba(15,18,26,0.88);backdrop-filter:blur(6px);padding:5px 11px;border-radius:6px;font-family:"JetBrains Mono",monospace;font-size:11px;font-weight:700;color:#f4f4f2;z-index:10;border:1px solid rgba(255,255,255,0.22);cursor:pointer;';
    smokeModeBtn.addEventListener('click', () => {
        currentSmokeModeIdx = (currentSmokeModeIdx + 1) % smokeModes.length;
        smokeModeBtn.textContent = smokeModes[currentSmokeModeIdx].label;
        smokeUniforms.uDensityBoost.value = smokeModes[currentSmokeModeIdx].density;
    });
    container.appendChild(smokeModeBtn);

    const legendBar = document.createElement('div');
    legendBar.style.cssText = 'position:absolute;bottom:12px;left:50%;transform:translateX(-50%);background:rgba(10,12,18,0.86);backdrop-filter:blur(8px);padding:6px 14px;border-radius:8px;box-shadow:0 6px 20px rgba(0,0,0,0.65);display:flex;align-items:center;gap:10px;font-family:"JetBrains Mono",monospace;font-size:11px;color:#e2e8f0;z-index:10;pointer-events:none;border:1px solid rgba(255,255,255,0.14);';
    legendBar.innerHTML = `
        <span style="font-weight:700;color:#d2ff00;">Cps (Pressure):</span>
        <span>-1.0</span>
        <div style="width:140px;height:9px;border-radius:99px;background:linear-gradient(90deg,#1424eb 0%,#06b6d4 25%,#16c94a 50%,#facc15 75%,#ef1a14 100%);"></div>
        <span>+1.0</span>
        <span style="color:#94a3b8;margin-left:4px;">[Biru: Hisapan • Merah: Tekanan Tinggi]</span>
    `;
    container.appendChild(legendBar);

    const carSelect = document.getElementById('carSelect');
    const speedRange = document.getElementById('speedRange');
    const speedValue = document.getElementById('speedValue');
    const drsToggle = document.getElementById('drsToggle');
    const drsBadge = document.getElementById('drsBadge');
    const cdDisplay = document.getElementById('cdDisplay');
    const dragDisplay = document.getElementById('dragDisplay');
    const powerDisplay = document.getElementById('powerDisplay');
    const flowDisplay = document.getElementById('flowDisplay');

    let customUserRotationY = 0;
    let customScaleMultiplier = 1.0;

    if (carSelect) {
        const labelEl = carSelect.parentElement ? carSelect.parentElement.querySelector('label') : null;
        if (labelEl) labelEl.textContent = '01 // PILIH 10 KENDARAAN / UPLOAD FILE 3D';
        carSelect.innerHTML = '';
        Object.keys(vehicleDatabase).forEach(key => {
            const opt = document.createElement('option');
            opt.value = key;
            opt.textContent = `${vehicleDatabase[key].name} (Cd: ${vehicleDatabase[key].cd.toFixed(3)})`;
            carSelect.appendChild(opt);
        });
        carSelect.value = 'motogp';

        if (carSelect.parentElement) {
            const actionRow = document.createElement('div');
            actionRow.style.cssText = 'display:flex;gap:5px;margin-top:4px;flex-wrap:wrap;';

            const fileInput = document.createElement('input');
            fileInput.type = 'file';
            fileInput.accept = '.glb,.gltf,.obj,.stl';
            fileInput.style.display = 'none';

            const uploadBtn = document.createElement('button');
            uploadBtn.type = 'button';
            uploadBtn.textContent = '📂 UPLOAD FILE 3D';
            uploadBtn.style.cssText = 'flex:1;min-width:130px;background:#d2ff00;color:#0a0a0a;border:none;padding:0.55rem 0.6rem;font-family:"JetBrains Mono",monospace;font-size:0.72rem;font-weight:700;cursor:pointer;';

            const rotateBtn = document.createElement('button');
            rotateBtn.type = 'button';
            rotateBtn.textContent = '🔄 +90°';
            rotateBtn.title = 'Putar arah hadap model 3D 90 derajat';
            rotateBtn.style.cssText = 'background:#181b22;color:#f4f4f2;border:1px solid rgba(255,255,255,0.25);padding:0.55rem 0.6rem;font-family:"JetBrains Mono",monospace;font-size:0.72rem;font-weight:700;cursor:pointer;';

            const scaleUpBtn = document.createElement('button');
            scaleUpBtn.type = 'button';
            scaleUpBtn.textContent = '➕ BESAR';
            scaleUpBtn.title = 'Perbesar ukuran kendaraan';
            scaleUpBtn.style.cssText = 'background:#181b22;color:#d2ff00;border:1px solid rgba(210,255,0,0.4);padding:0.55rem 0.6rem;font-family:"JetBrains Mono",monospace;font-size:0.72rem;font-weight:700;cursor:pointer;';

            const scaleDownBtn = document.createElement('button');
            scaleDownBtn.type = 'button';
            scaleDownBtn.textContent = '➖ KECIL';
            scaleDownBtn.title = 'Perkecil ukuran kendaraan';
            scaleDownBtn.style.cssText = 'background:#181b22;color:#f4f4f2;border:1px solid rgba(255,255,255,0.25);padding:0.55rem 0.6rem;font-family:"JetBrains Mono",monospace;font-size:0.72rem;font-weight:700;cursor:pointer;';

            uploadBtn.addEventListener('click', () => fileInput.click());
            fileInput.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (file) loadLocal3DFile(file);
            });

            rotateBtn.addEventListener('click', () => {
                customUserRotationY += Math.PI / 2;
                realignActiveVehicle();
            });

            scaleUpBtn.addEventListener('click', () => {
                customScaleMultiplier = Math.min(3.5, customScaleMultiplier * 1.18);
                realignActiveVehicle();
            });

            scaleDownBtn.addEventListener('click', () => {
                customScaleMultiplier = Math.max(0.35, customScaleMultiplier * 0.85);
                realignActiveVehicle();
            });

            actionRow.appendChild(uploadBtn);
            actionRow.appendChild(rotateBtn);
            actionRow.appendChild(scaleUpBtn);
            actionRow.appendChild(scaleDownBtn);
            carSelect.parentElement.appendChild(fileInput);
            carSelect.parentElement.appendChild(actionRow);
        }
    }

    let isDrsActive = false;

    // 3. SETUP SCENE RUANG HAMPA HITAM + STUDIO REFLECTION
    const width = container.clientWidth || 680;
    const height = container.clientHeight || 460;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x050608);
    scene.fog = new THREE.FogExp2(0x050608, 0.020);

    const camera = new THREE.PerspectiveCamera(35, width / height, 0.1, 120);
    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.24;
    container.appendChild(renderer.domElement);

    function createDarkStudioEnvMap() {
        const c = document.createElement('canvas');
        c.width = 512;
        c.height = 256;
        const ctx = c.getContext('2d');
        ctx.fillStyle = '#050608';
        ctx.fillRect(0, 0, 512, 256);
        ctx.fillStyle = '#ffffff';
        [75, 180, 285, 390].forEach(x => ctx.fillRect(x, 18, 46, 20));
        const tex = new THREE.CanvasTexture(c);
        tex.mapping = THREE.EquirectangularReflectionMapping;
        return tex;
    }
    scene.environment = createDarkStudioEnvMap();

    // 4. KONTROL KAMERA 3D BEBAS 360° & ZOOM
    const defaultCam = { theta: -0.32, phi: 1.28, radius: 5.8 };
    let camTheta = defaultCam.theta;
    let camPhi = defaultCam.phi;
    let camRadius = defaultCam.radius;
    let isDragging = false;
    let prevMouse = { x: 0, y: 0 };

    function updateCameraPosition() {
        const targetX = 0.0;
        const targetY = 0.85;
        camera.position.x = targetX + camRadius * Math.sin(camPhi) * Math.sin(camTheta);
        camera.position.y = targetY + camRadius * Math.cos(camPhi);
        camera.position.z = camRadius * Math.sin(camPhi) * Math.cos(camTheta);
        camera.lookAt(targetX, targetY, 0);
    }
    updateCameraPosition();

    container.addEventListener('mousedown', (e) => {
        isDragging = true;
        prevMouse = { x: e.clientX, y: e.clientY };
        container.style.cursor = 'grabbing';
    });
    window.addEventListener('mouseup', () => {
        isDragging = false;
        container.style.cursor = 'grab';
    });
    window.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        camTheta -= (e.clientX - prevMouse.x) * 0.008;
        camPhi = Math.max(0.12, Math.min(Math.PI / 2 - 0.02, camPhi - (e.clientY - prevMouse.y) * 0.008));
        prevMouse = { x: e.clientX, y: e.clientY };
        updateCameraPosition();
    });
    container.addEventListener('wheel', (e) => {
        e.preventDefault();
        camRadius = Math.max(2.0, Math.min(14.5, camRadius + e.deltaY * 0.007));
        updateCameraPosition();
    }, { passive: false });

    container.addEventListener('dblclick', () => {
        camTheta = defaultCam.theta;
        camPhi = defaultCam.phi;
        camRadius = defaultCam.radius;
        updateCameraPosition();
    });

    // 5. LAMPU STUDIO DI ATAS (OVERHEAD LIGHTING RIG) & LANTAI HITAM REFLEKTIF
    scene.add(new THREE.HemisphereLight(0xf8fafc, 0x0f172a, 0.72));

    const overheadRig = new THREE.Group();
    scene.add(overheadRig);

    const rigMetalMat = new THREE.MeshStandardMaterial({ color: 0x181b22, metalness: 0.85, roughness: 0.28 });
    const lampHousingMat = new THREE.MeshStandardMaterial({ color: 0x0f1116, metalness: 0.8, roughness: 0.25 });
    const lampEmitterMat = new THREE.MeshBasicMaterial({ color: 0xfffef7, side: THREE.DoubleSide });

    [-0.55, 0.55].forEach(rz => {
        const rail = new THREE.Mesh(new THREE.BoxGeometry(6.8, 0.045, 0.045), rigMetalMat);
        rail.position.set(0, 2.95, rz);
        overheadRig.add(rail);
    });

    [-2.2, -0.75, 0.75, 2.2].forEach(lx => {
        const crossMount = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.04, 1.15), rigMetalMat);
        crossMount.position.set(lx, 2.95, 0);
        overheadRig.add(crossMount);

        const softbox = new THREE.Mesh(new THREE.BoxGeometry(0.78, 0.07, 0.56), lampHousingMat);
        softbox.position.set(lx, 2.89, 0);
        overheadRig.add(softbox);

        const diffuser = new THREE.Mesh(new THREE.PlaneGeometry(0.70, 0.48), lampEmitterMat);
        diffuser.rotation.x = Math.PI / 2;
        diffuser.position.set(lx, 2.85, 0);
        overheadRig.add(diffuser);

        const spot = new THREE.SpotLight(0xfffbeb, 1.55);
        spot.position.set(lx, 2.84, 0);
        spot.target.position.set(lx * 0.65, 0.4, 0);
        spot.angle = Math.PI / 3.4;
        spot.penumbra = 0.85;
        spot.distance = 9.5;
        scene.add(spot);
        scene.add(spot.target);
    });

    const sideKeyLight = new THREE.DirectionalLight(0xf1f5f9, 0.95);
    sideKeyLight.position.set(-3.2, 2.8, 4.8);
    scene.add(sideKeyLight);

    const backRimLight = new THREE.DirectionalLight(0x94a3b8, 0.55);
    backRimLight.position.set(3.5, 2.4, -4.2);
    scene.add(backRimLight);

    function createDarkFloorDisc() {
        const c = document.createElement('canvas');
        c.width = 512;
        c.height = 512;
        const ctx = c.getContext('2d');
        const grad = ctx.createRadialGradient(256, 256, 20, 256, 256, 250);
        grad.addColorStop(0.0, 'rgba(24, 28, 38, 0.95)');
        grad.addColorStop(0.45, 'rgba(12, 14, 19, 0.75)');
        grad.addColorStop(0.80, 'rgba(5, 6, 8, 0.25)');
        grad.addColorStop(1.0, 'rgba(5, 6, 8, 0.0)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 512, 512);
        const tex = new THREE.CanvasTexture(c);
        const mesh = new THREE.Mesh(
            new THREE.PlaneGeometry(14.0, 10.5),
            new THREE.MeshStandardMaterial({
                map: tex,
                transparent: true,
                roughness: 0.35,
                metalness: 0.45,
                depthWrite: false
            })
        );
        mesh.rotation.x = -Math.PI / 2;
        mesh.position.y = 0.001;
        return mesh;
    }
    const darkFloor = createDarkFloorDisc();
    scene.add(darkFloor);

    // 6. BENDA GENERATOR ASAP DI DEPAN KENDARAAN (MULTI-LAYER SMOKE RAKE)
    const emitterGroup = new THREE.Group();
    emitterGroup.position.set(-3.45, 0, 0);
    scene.add(emitterGroup);

    const emitterBodyMat = new THREE.MeshStandardMaterial({ color: 0x262b36, metalness: 0.85, roughness: 0.22 });
    const nozzleSteelMat = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, metalness: 0.92, roughness: 0.16 });
    const vaporGlowMat = new THREE.MeshBasicMaterial({ color: 0xffffff });

    const mainMast = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.030, 2.35, 16), emitterBodyMat);
    mainMast.scale.set(1.7, 1, 0.62);
    mainMast.position.set(0, 1.20, 0);
    emitterGroup.add(mainMast);

    [0.05, 2.38].forEach(py => {
        const pod = new THREE.Mesh(new THREE.CylinderGeometry(0.058, 0.058, 0.26, 16), emitterBodyMat);
        pod.rotation.z = Math.PI / 2;
        pod.position.set(-0.04, py, 0);
        emitterGroup.add(pod);
    });

    // 22 Nosel Asap: 14 Vertikal Tengah + 8 Samping (Atas & Bawah Bodi)
    const nozzleSpecs = [];
    for (let i = 0; i < 14; i++) {
        nozzleSpecs.push({ y: 0.14 + i * 0.16, z: 0, layerIndex: i, isSide: false });
    }
    const sideNozzleCoords = [
        { y: 0.36, z: 0.34, layerIndex: 1 },
        { y: 0.36, z: -0.34, layerIndex: 1 },
        { y: 0.36, z: 0.68, layerIndex: 1 },
        { y: 0.36, z: -0.68, layerIndex: 1 },
        { y: 0.88, z: 0.38, layerIndex: 4 },
        { y: 0.88, z: -0.38, layerIndex: 4 },
        { y: 0.88, z: 0.74, layerIndex: 4 },
        { y: 0.88, z: -0.74, layerIndex: 4 }
    ];
    sideNozzleCoords.forEach(s => nozzleSpecs.push({ ...s, isSide: true }));

    [0.36, 0.88].forEach(hy => {
        const crossBar = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 1.52, 12), emitterBodyMat);
        crossBar.rotation.x = Math.PI / 2;
        crossBar.position.set(0, hy, 0);
        emitterGroup.add(crossBar);
    });

    nozzleSpecs.forEach(ns => {
        const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.010, 0.014, 0.24, 10), nozzleSteelMat);
        pipe.rotation.z = Math.PI / 2;
        pipe.position.set(0.11, ns.y, ns.z);
        emitterGroup.add(pipe);

        const tip = new THREE.Mesh(new THREE.SphereGeometry(0.016, 10, 10), vaporGlowMat);
        tip.position.set(0.24, ns.y, ns.z);
        emitterGroup.add(tip);
    });

    // 7. SHADER WARNA TEKANAN AIRSHAPER (Cps SURFACE PRESSURE MAP)
    const pressureUniforms = {
        uSpeedNorm: { value: 0.6 },
        uDrsOpen: { value: 0.0 }
    };

    function createAirShaperPressureMaterial() {
        const mat = new THREE.MeshPhysicalMaterial({
            color: 0xffffff,
            roughness: 0.22,
            metalness: 0.12,
            clearcoat: 0.72,
            clearcoatRoughness: 0.14,
            side: THREE.DoubleSide
        });

        mat.onBeforeCompile = (shader) => {
            shader.uniforms.uSpeedNorm = pressureUniforms.uSpeedNorm;
            shader.uniforms.uDrsOpen = pressureUniforms.uDrsOpen;

            shader.vertexShader = shader.vertexShader
                .replace(
                    '#include <common>',
                    `#include <common>
                    varying vec3 vAeroWorldPos;
                    varying vec3 vAeroWorldNormal;`
                )
                .replace(
                    '#include <worldpos_vertex>',
                    `#include <worldpos_vertex>
                    vec4 wpCustom = vec4(transformed, 1.0);
                    #ifdef USE_INSTANCING
                        wpCustom = instanceMatrix * wpCustom;
                    #endif
                    wpCustom = modelMatrix * wpCustom;
                    vAeroWorldPos = wpCustom.xyz;
                    vAeroWorldNormal = normalize(mat3(modelMatrix) * objectNormal);`
                );

            shader.fragmentShader = shader.fragmentShader
                .replace(
                    '#include <common>',
                    `#include <common>
                    uniform float uSpeedNorm;
                    uniform float uDrsOpen;
                    varying vec3 vAeroWorldPos;
                    varying vec3 vAeroWorldNormal;

                    vec3 airShaperColormap(float t) {
                        vec3 c0 = vec3(0.08, 0.15, 0.94); // -1.0 Deep Blue (Hisapan / Suction)
                        vec3 c1 = vec3(0.02, 0.75, 0.96); // -0.5 Cyan
                        vec3 c2 = vec3(0.10, 0.82, 0.30); //  0.0 Green (Netral)
                        vec3 c3 = vec3(0.99, 0.88, 0.04); // +0.5 Yellow
                        vec3 c4 = vec3(0.96, 0.10, 0.06); // +1.0 Red (Tekanan Tinggi / Stagnasi)

                        if (t < 0.25) return mix(c0, c1, t / 0.25);
                        if (t < 0.50) return mix(c1, c2, (t - 0.25) / 0.25);
                        if (t < 0.75) return mix(c2, c3, (t - 0.50) / 0.25);
                        return mix(c3, c4, (t - 0.75) / 0.25);
                    }`
                )
                .replace(
                    '#include <color_fragment>',
                    `#include <color_fragment>
                    vec3 wn = normalize(vAeroWorldNormal);
                    float frontalStagnation = clamp(-wn.x, 0.0, 1.0);
                    float upperSuction = clamp(wn.y, 0.0, 1.0) * smoothstep(-2.6, -0.1, vAeroWorldPos.x) * (1.0 - smoothstep(0.7, 2.7, vAeroWorldPos.x));
                    float shoulderSuction = abs(wn.z) * smoothstep(-1.5, 0.6, vAeroWorldPos.x) * (1.0 - smoothstep(0.8, 2.4, vAeroWorldPos.x)) * 0.55;
                    float lowerVenturi = clamp(-wn.y, 0.0, 1.0) * 0.52;

                    float cps = frontalStagnation * 1.32 - (upperSuction * 1.12 + shoulderSuction + lowerVenturi);
                    cps *= (0.55 + 0.58 * uSpeedNorm);

                    if (uDrsOpen > 0.5 && vAeroWorldPos.x > 1.25 && vAeroWorldPos.y > 0.65) {
                        cps *= 0.20;
                    }

                    cps = clamp(cps, -1.0, 1.0);
                    vec3 mappedColor = airShaperColormap(cps * 0.5 + 0.5);

                    float flowContour = sin((vAeroWorldPos.y * 28.0 + vAeroWorldPos.z * 14.0) + sin(vAeroWorldPos.x * 3.2) * 2.2);
                    float lineMask = smoothstep(0.92, 0.99, abs(flowContour));
                    mappedColor = mix(mappedColor, mappedColor * 0.76, lineMask * 0.32);

                    diffuseColor.rgb = mappedColor;`
                );
        };
        return mat;
    }

    const airShaperMaterial = createAirShaperPressureMaterial();

    // 8. ENGINE PEMUAT FILE 3D (.GLB / .GLTF / .OBJ / .STL) + SMART MESH-ONLY AUTO-SCALER
    const currentVehicleGroup = new THREE.Group();
    let activeRawObject = null;
    let activeSpec = null;
    scene.add(currentVehicleGroup);

    function computeMeshOnlyBox(rootObj) {
        const box = new THREE.Box3();
        rootObj.updateMatrixWorld(true);
        rootObj.traverse((child) => {
            if (child.isMesh && child.geometry) {
                if (!child.geometry.boundingBox) child.geometry.computeBoundingBox();
                const mb = child.geometry.boundingBox.clone().applyMatrix4(child.matrixWorld);
                box.union(mb);
            }
        });
        if (box.isEmpty()) box.setFromObject(rootObj);
        return box;
    }

    function realignActiveVehicle() {
        if (!activeRawObject || !activeSpec) return;

        while (currentVehicleGroup.children.length > 0) {
            currentVehicleGroup.remove(currentVehicleGroup.children[0]);
        }

        const wrapper = new THREE.Group();
        activeRawObject.position.set(0, 0, 0);
        activeRawObject.scale.set(1, 1, 1);
        activeRawObject.rotation.set(0, (activeSpec.defaultRotY || 0) + customUserRotationY, 0);
        wrapper.add(activeRawObject);

        const box = computeMeshOnlyBox(wrapper);
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z) || 1;
        const targetLength = (activeSpec.targetSize || 4.6) * customScaleMultiplier;
        const scaleFactor = targetLength / maxDim;

        wrapper.scale.setScalar(scaleFactor);

        const scaledBox = computeMeshOnlyBox(wrapper);
        const scaledCenter = scaledBox.getCenter(new THREE.Vector3());

        wrapper.position.x = -scaledCenter.x;
        wrapper.position.z = -scaledCenter.z;
        wrapper.position.y = (activeSpec.airborne ? 0.65 : 0.0) - scaledBox.min.y;

        currentVehicleGroup.add(wrapper);
        darkFloor.visible = !activeSpec.airborne;

        const finalBox = computeMeshOnlyBox(wrapper);
        activeSpec.tailX = Math.max(0.8, finalBox.max.x);

        bakeVehicleAeroEnvelope();
    }

    function applyAirShaperShaderAndNormalize(rawObject, spec, sourceLabel) {
        rawObject.traverse((child) => {
            if (child.isMesh) {
                if (child.geometry && !child.geometry.attributes.normal) {
                    child.geometry.computeVertexNormals();
                }
                child.material = airShaperMaterial;
            }
        });

        activeRawObject = rawObject;
        activeSpec = spec;
        modelStatusTag.textContent = `3D FILE AKTIF: ${sourceLabel} (SKALA ${Math.round(customScaleMultiplier * 100)}%)`;
        realignActiveVehicle();
    }

   function createConfiguredGLTFLoader() {
        const loader = new THREE.GLTFLoader();
        if (THREE.DRACOLoader) {
            const dracoLoader = new THREE.DRACOLoader();
            dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.4.1/');
            loader.setDRACOLoader(dracoLoader);
        }
        return loader;
    }

    function loadVehicleFromUrl(vehicleKey) {
        const spec = vehicleDatabase[vehicleKey] || vehicleDatabase.motogp;
        customUserRotationY = 0;
        customScaleMultiplier = 1.0;

        if (spec.modelUrl && spec.modelUrl.trim() !== '' && THREE.GLTFLoader) {
            modelStatusTag.textContent = `MEMUAT FILE 3D: ${spec.name}...`;
            const loader = createConfiguredGLTFLoader();
            loader.load(
                spec.modelUrl,
                (gltf) => {
                    applyAirShaperShaderAndNormalize(gltf.scene, spec, spec.name);
                },
                undefined,
                (err) => {
                    console.error('Gagal memuat URL .glb:', err);
                    modelStatusTag.textContent = 'GAGAL MEMUAT URL .GLB — GUNAKAN TOMBOL UPLOAD FILE 3D';
                    buildFallbackMesh(spec);
                }
            );
        } else {
            buildFallbackMesh(spec);
        }
    }

    function loadLocal3DFile(file) {
        const key = carSelect ? carSelect.value : 'gt3_race';
        const spec = vehicleDatabase[key] || vehicleDatabase.gt3_race;
        const ext = file.name.split('.').pop().toLowerCase();
        const blobUrl = URL.createObjectURL(file);

        modelStatusTag.textContent = `MEMPROSES FILE 3D: ${file.name.toUpperCase()}...`;

        if ((ext === 'glb' || ext === 'gltf') && THREE.GLTFLoader) {
           createConfiguredGLTFLoader().load(blobUrl, (gltf) => {
                applyAirShaperShaderAndNormalize(gltf.scene, spec, file.name.toUpperCase());
                URL.revokeObjectURL(blobUrl);
            });
        } else if (ext === 'obj' && THREE.OBJLoader) {
            new THREE.OBJLoader().load(blobUrl, (obj) => {
                applyAirShaperShaderAndNormalize(obj, spec, file.name.toUpperCase());
                URL.revokeObjectURL(blobUrl);
            });
        } else if (ext === 'stl' && THREE.STLLoader) {
            new THREE.STLLoader().load(blobUrl, (geometry) => {
                const mesh = new THREE.Mesh(geometry, airShaperMaterial);
                mesh.rotation.x = -Math.PI / 2;
                applyAirShaperShaderAndNormalize(mesh, spec, file.name.toUpperCase());
                URL.revokeObjectURL(blobUrl);
            });
        } else {
            modelStatusTag.textContent = 'FORMAT TIDAK DIDUKUNG (GUNAKAN .GLB, .GLTF, .OBJ, ATAU .STL)';
        }
    }

    function buildFallbackMesh(spec) {
        const group = new THREE.Group();
        const core = new THREE.Mesh(new THREE.SphereGeometry(0.85, 36, 24), airShaperMaterial);
        if (spec.airborne) {
            core.scale.set(0.45, 0.35, 2.8);
            const wing = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.06, 0.75), airShaperMaterial);
            group.add(wing);
        } else if (spec.targetSize < 3.6) {
            core.scale.set(0.45, 0.72, 1.35);
        } else {
            core.scale.set(1.05, 0.62, 2.45);
        }
        group.add(core);
        applyAirShaperShaderAndNormalize(group, spec, `${spec.name} [KLIK UPLOAD FILE 3D]`);
    }

    // 9. PEMETAAN KONTUR 2D (X × Z) CEPAT (< 5ms) UNTUK PEMBUNGKUSAN ASAP 3D
    let aeroField2D = null;

    function bakeVehicleAeroEnvelope() {
        currentVehicleGroup.updateMatrixWorld(true);

        const xMin = -3.6, xMax = 5.2, xStep = 0.05;
        const zMin = -1.6, zMax = 1.6, zStep = 0.10;
        const nx = Math.round((xMax - xMin) / xStep) + 1;
        const nz = Math.round((zMax - zMin) / zStep) + 1;

        const rawGrid = new Float32Array(nx * nz);
        const halfWidth = new Float32Array(nx);

        let totalVertices = 0;
        const meshList = [];
        currentVehicleGroup.traverse((child) => {
            if (child.isMesh && child.geometry && child.geometry.attributes.position) {
                totalVertices += child.geometry.attributes.position.count;
                meshList.push(child);
            }
        });

        const globalStride = Math.max(1, Math.floor(totalVertices / 18000));
        const tempVec = new THREE.Vector3();

        for (let m = 0; m < meshList.length; m++) {
            const mesh = meshList[m];
            const posAttr = mesh.geometry.attributes.position;
            const count = posAttr.count;
            const matWorld = mesh.matrixWorld;

            for (let v = 0; v < count; v += globalStride) {
                tempVec.fromBufferAttribute(posAttr, v).applyMatrix4(matWorld);
                const ix = Math.round((tempVec.x - xMin) / xStep);
                const iz = Math.round((tempVec.z - zMin) / zStep);
                if (ix < 0 || ix >= nx || iz < 0 || iz >= nz) continue;

                const idx = ix * nz + iz;
                if (tempVec.y > rawGrid[idx]) rawGrid[idx] = tempVec.y;

                const absZ = Math.abs(tempVec.z);
                if (absZ > halfWidth[ix]) halfWidth[ix] = absZ;
            }
        }

        const finalGrid = new Float32Array(nx * nz);
        const lookAhead = Math.round(0.75 / xStep);
        const wakeHold = Math.round(1.8 / xStep);

        for (let iz = 0; iz < nz; iz++) {
            for (let ix = 0; ix < nx; ix++) {
                let h = rawGrid[ix * nz + iz];
                if (iz > 0) h = Math.max(h, rawGrid[ix * nz + (iz - 1)] * 0.94);
                if (iz < nz - 1) h = Math.max(h, rawGrid[ix * nz + (iz + 1)] * 0.94);

                for (let k = 1; k <= lookAhead && (ix + k) < nx; k++) {
                    const w = Math.cos((k / lookAhead) * (Math.PI / 2));
                    h = Math.max(h, rawGrid[(ix + k) * nz + iz] * (0.18 + 0.82 * w));
                }
                for (let k = 1; k <= wakeHold && (ix - k) >= 0; k++) {
                    const decay = Math.max(0, 1.0 - (k / wakeHold) * 0.32);
                    h = Math.max(h, rawGrid[(ix - k) * nz + iz] * decay);
                }
                finalGrid[ix * nz + iz] = h;
            }
        }

        const smoothHalfW = new Float32Array(nx);
        for (let ix = 0; ix < nx; ix++) {
            let maxW = halfWidth[ix];
            for (let k = -8; k <= 8; k++) {
                if (ix + k >= 0 && ix + k < nx) {
                    const w = Math.cos((k / 9) * (Math.PI / 2));
                    maxW = Math.max(maxW, halfWidth[ix + k] * w);
                }
            }
            smoothHalfW[ix] = maxW;
        }

        aeroField2D = { xMin, zMin, xStep, zStep, nx, nz, grid: finalGrid, halfWidth: smoothHalfW };
    }

    function sampleAeroField(x, z) {
        if (!aeroField2D) return { y: 0, halfW: 0 };
        const fx = (x - aeroField2D.xMin) / aeroField2D.xStep;
        const fz = (z - aeroField2D.zMin) / aeroField2D.zStep;
        if (fx <= 0 || fx >= aeroField2D.nx - 1) return { y: 0, halfW: 0 };

        const ix0 = Math.floor(fx);
        const tx = fx - ix0;
        const halfW = aeroField2D.halfWidth[ix0] * (1 - tx) + aeroField2D.halfWidth[ix0 + 1] * tx;

        if (fz <= 0 || fz >= aeroField2D.nz - 1) return { y: 0, halfW };
        const iz0 = Math.floor(fz);
        const tz = fz - iz0;

        const nz = aeroField2D.nz;
        const g = aeroField2D.grid;
        const h00 = g[ix0 * nz + iz0];
        const h10 = g[(ix0 + 1) * nz + iz0];
        const h01 = g[ix0 * nz + (iz0 + 1)];
        const h11 = g[(ix0 + 1) * nz + (iz0 + 1)];

        const y = (h00 * (1 - tx) + h10 * tx) * (1 - tz) + (h01 * (1 - tx) + h11 * tx) * tz;
        return { y, halfW };
    }

    // 10. TEKSTUR SERAT ASAP BERLAPIS & INSTANCED VOLUMETRIC STREAM ENGINE (3.200 ELEMEN)
    function createWispySmokeTexture() {
        const size = 256;
        const c = document.createElement('canvas');
        c.width = size;
        c.height = size;
        const ctx = c.getContext('2d');
        const imgData = ctx.createImageData(size, size);
        const data = imgData.data;

        function hash2(x, y) {
            const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453123;
            return n - Math.floor(n);
        }

        function noise2(x, y) {
            const ix = Math.floor(x);
            const iy = Math.floor(y);
            const fx = x - ix;
            const fy = y - iy;
            const ux = fx * fx * (3 - 2 * fx);
            const uy = fy * fy * (3 - 2 * fy);
            return (
                hash2(ix, iy) * (1 - ux) * (1 - uy) +
                hash2(ix + 1, iy) * ux * (1 - uy) +
                hash2(ix, iy + 1) * (1 - ux) * uy +
                hash2(ix + 1, iy + 1) * ux * uy
            );
        }

        function fbm2(x, y) {
            let val = 0;
            let amp = 0.54;
            for (let i = 0; i < 5; i++) {
                val += amp * noise2(x, y);
                x = x * 2.06 + 1.3;
                y = y * 2.06 - 1.7;
                amp *= 0.5;
            }
            return val;
        }

        for (let py = 0; py < size; py++) {
            for (let px = 0; px < size; px++) {
                const u = px / size;
                const v = py / size;
                const dx = (u - 0.5) * 2.0;
                const dy = (v - 0.5) * 2.0;
                const dist = Math.sqrt(dx * dx + dy * dy);

                const warpX = fbm2(u * 3.2 + 0.7, v * 5.8 + 2.1);
                const warpY = fbm2(u * 2.6 + 4.3, v * 6.4 + 1.1);
                const wisp = fbm2(u * 3.6 + warpX * 1.3, v * 7.2 + warpY * 1.5);

                const radial = Math.max(0, 1.0 - Math.pow(dist, 1.65));
                const softEnvelope = radial * radial * (3.0 - 2.0 * radial);
                const alpha = Math.max(0, Math.min(1, softEnvelope * (0.38 + 0.92 * wisp)));

                const coreHighlight = Math.round(210 + 45 * wisp);
                const depthMap = Math.round(softEnvelope * wisp * 255);

                const idx = (py * size + px) * 4;
                data[idx] = coreHighlight;
                data[idx + 1] = depthMap;
                data[idx + 2] = 255;
                data[idx + 3] = Math.round(alpha * 255);
            }
        }
        ctx.putImageData(imgData, 0, 0);
        return new THREE.CanvasTexture(c);
    }

    const wispySmokeTex = createWispySmokeTexture();
    const smokeUniforms = {
        uSmokeTex: { value: wispySmokeTex },
        uDensityBoost: { value: 1.0 }
    };

    const puffCount = 3200;
    const baseQuad = new THREE.PlaneGeometry(1, 1);
    const instancedGeo = new THREE.InstancedBufferGeometry();
    instancedGeo.index = baseQuad.index;
    instancedGeo.attributes.position = baseQuad.attributes.position;
    instancedGeo.attributes.uv = baseQuad.attributes.uv;
    instancedGeo.instanceCount = puffCount;
    instancedGeo.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 1, 0), 25);

    const aPos = new Float32Array(puffCount * 3);
    const aFlowDir = new Float32Array(puffCount * 3);
    const aScale = new Float32Array(puffCount * 2);
    const aMeta = new Float32Array(puffCount * 3); // x: alpha, y: phase/rot, z: wakeMix

    const attrPos = new THREE.InstancedBufferAttribute(aPos, 3);
    const attrFlowDir = new THREE.InstancedBufferAttribute(aFlowDir, 3);
    const attrScale = new THREE.InstancedBufferAttribute(aScale, 2);
    const attrMeta = new THREE.InstancedBufferAttribute(aMeta, 3);

    instancedGeo.setAttribute('aPos', attrPos);
    instancedGeo.setAttribute('aFlowDir', attrFlowDir);
    instancedGeo.setAttribute('aScale', attrScale);
    instancedGeo.setAttribute('aMeta', attrMeta);

    const volumetricSmokeMat = new THREE.ShaderMaterial({
        uniforms: smokeUniforms,
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
        blending: THREE.NormalBlending,
        vertexShader: `
            attribute vec3 aPos;
            attribute vec3 aFlowDir;
            attribute vec2 aScale;
            attribute vec3 aMeta;
            varying vec2 vUv;
            varying vec3 vMeta;
            varying vec3 vLitColor;
            varying vec3 vShadowColor;

            void main() {
                vUv = uv;
                vMeta = aMeta;

                vec4 worldCenter = modelMatrix * vec4(aPos, 1.0);
                vec4 mvCenter = viewMatrix * worldCenter;

                // Orientasi billboard kamera + peregangan searah vektor aliran angin 3D
                vec3 viewFlow = (viewMatrix * modelMatrix * vec4(aFlowDir, 0.0)).xyz;
                vec2 axisLong = length(viewFlow.xy) > 0.0005 ? normalize(viewFlow.xy) : vec2(1.0, 0.0);
                vec2 axisPerp = vec2(-axisLong.y, axisLong.x);

                mvCenter.xy += axisLong * (position.x * aScale.x) + axisPerp * (position.y * aScale.y);

                // Pencahayaan 4 lampu softbox studio di langit-langit
                float lampIntensity = 0.54;
                float lamps[4];
                lamps[0] = -2.2;
                lamps[1] = -0.75;
                lamps[2] = 0.75;
                lamps[3] = 2.2;
                for (int i = 0; i < 4; i++) {
                    float dx = worldCenter.x - lamps[i];
                    float dy = (worldCenter.y - 2.85) * 0.42;
                    lampIntensity += exp(-(dx * dx + dy * dy) * 1.15) * 0.56;
                }

                vLitColor = vec3(1.00, 0.99, 0.96) * min(1.36, lampIntensity);
                vShadowColor = vec3(0.46, 0.54, 0.66) * min(1.15, lampIntensity * 0.95);

                gl_Position = projectionMatrix * mvCenter;
            }
        `,
        fragmentShader: `
            uniform sampler2D uSmokeTex;
            uniform float uDensityBoost;
            varying vec2 vUv;
            varying vec3 vMeta;
            varying vec3 vLitColor;
            varying vec3 vShadowColor;

            vec2 rot2D(vec2 uv, float a) {
                float s = sin(a);
                float c = cos(a);
                vec2 p = uv - 0.5;
                return vec2(p.x * c - p.y * s, p.x * s + p.y * c) + 0.5;
            }

            void main() {
                float alphaMult = vMeta.x;
                float phase = vMeta.y;
                float wakeMix = vMeta.z;

                vec2 uvStream = vec2(fract(vUv.x * 0.85 + phase * 0.15), vUv.y);
                vec2 uvVortex = rot2D(vUv, phase * 1.35);

                vec4 s1 = texture2D(uSmokeTex, uvStream);
                vec4 s2 = texture2D(uSmokeTex, uvVortex);

                float wispMask = mix(s1.a, (s1.a * 0.45 + s2.a * 0.75), wakeMix);
                if (wispMask < 0.015) discard;

                float topRim = smoothstep(0.15, 0.88, 1.0 - vUv.y);
                float internalDensity = mix(s1.g, s2.g, wakeMix);
                vec3 finalRgb = mix(vShadowColor, vLitColor, clamp(topRim * 0.72 + internalDensity * 0.38, 0.0, 1.0));

                float finalAlpha = clamp(wispMask * alphaMult * uDensityBoost * 0.30, 0.0, 0.56);
                gl_FragColor = vec4(finalRgb, finalAlpha);
            }
        `
    });

    const volumetricSmokeMesh = new THREE.Mesh(instancedGeo, volumetricSmokeMat);
    volumetricSmokeMesh.frustumCulled = false;
    scene.add(volumetricSmokeMesh);

    const puffData = [];
    for (let i = 0; i < puffCount; i++) {
        const nSpec = nozzleSpecs[i % nozzleSpecs.length];
        puffData.push({
            progress: Math.random(),
            speedMult: 0.88 + Math.random() * 0.26,
            jitterY: (Math.random() - 0.5) * 0.032,
            jitterZ: (Math.random() - 0.5) * 0.045,
            phase: Math.random() * Math.PI * 2,
            spinDir: Math.random() > 0.5 ? 1 : -1,
            nozzle: nSpec
        });
    }

    // 11. KALKULASI TELEMETRI AERODINAMIKA
    function updateTelemetry() {
        const key = carSelect ? carSelect.value : 'motogp';
        const selected = vehicleDatabase[key] || vehicleDatabase.motogp;
        const speedKmh = speedRange ? parseFloat(speedRange.value) : 180;
        if (speedValue) speedValue.textContent = `${speedKmh} KM/H`;

        pressureUniforms.uSpeedNorm.value = Math.max(0.15, Math.min(1.0, speedKmh / 320));
        pressureUniforms.uDrsOpen.value = isDrsActive ? 1.0 : 0.0;

        const activeCd = isDrsActive ? selected.cd * 0.85 : selected.cd;
        const v = speedKmh / 3.6;
        const dragNewton = 0.5 * 1.225 * Math.pow(v, 2) * activeCd * selected.area;
        const powerHp = (dragNewton * v) / 745.7;

        if (cdDisplay) cdDisplay.textContent = activeCd.toFixed(3);
        if (dragDisplay) dragDisplay.textContent = `${Math.round(dragNewton).toLocaleString()} N`;
        if (powerDisplay) powerDisplay.textContent = `${powerHp.toFixed(1)} HP`;

        if (flowDisplay) {
            if (activeCd >= 0.52 && speedKmh > 140) {
                flowDisplay.textContent = 'HIGH PRESSURE WAKE';
                flowDisplay.style.color = '#ef4444';
            } else if (isDrsActive) {
                flowDisplay.textContent = 'DRS OPEN // LOW DRAG';
                flowDisplay.style.color = '#d2ff00';
            } else if (activeCd <= 0.24) {
                flowDisplay.textContent = 'LAMINAR STREAMLINE';
                flowDisplay.style.color = '#d2ff00';
            } else {
                flowDisplay.textContent = `Cl: ${selected.cl.toFixed(2)} // ACTIVE FLOW`;
                flowDisplay.style.color = '#f4f4f2';
            }
        }
        return { selected, activeCd, speedKmh };
    }

    // 12. LOOP ANIMASI REAL-TIME ALIRAN ASAP ANISOTROPIK 3D
    function computeSmokePoint(p, t, selected, activeCd, clockTime, stretchMode) {
        const x = -3.21 + t * 8.2;
        const n = p.nozzle;

        let y = n.y + p.jitterY * (0.3 + t * 1.3) + Math.sin(x * 1.6 - clockTime * 4.8 + p.phase) * (0.014 + t * 0.025);
        let z = n.z + p.jitterZ * (0.3 + t * 1.5) + Math.cos(x * 1.5 - clockTime * 4.4 + p.phase) * (0.014 + t * 0.028);

        const field = sampleAeroField(x, z);

        if (field.y > 0.01) {
            const clearance = 0.045 + n.layerIndex * 0.036;
            const reqY = field.y + clearance;
            if (reqY > y) y = reqY;
        }

        if (n.isSide && field.halfW > 0.06) {
            const minSideZ = field.halfW + 0.11;
            if (Math.abs(z) < minSideZ) {
                z = minSideZ * Math.sign(n.z);
            }
        }

        let wakeMix = 0.0;
        let lenScale = (0.48 + t * 0.42) * stretchMode;
        let thickScale = 0.14 + Math.pow(t, 0.85) * 0.34;

        if (x >= selected.tailX - 0.10) {
            const wakeDist = x - (selected.tailX - 0.10);
            wakeMix = Math.min(1.0, wakeDist / 1.15);
            const drsDamp = isDrsActive ? 0.52 : 1.0;

            const swirlAngle = wakeDist * 3.4 - clockTime * 6.8 + p.phase;
            const vortexRadius = Math.min(0.55, activeCd * 0.32 * wakeDist * drsDamp);

            y += Math.sin(swirlAngle) * vortexRadius;
            z += Math.cos(swirlAngle) * (vortexRadius * 0.90);

            const cloudExpand = wakeDist * (0.38 * drsDamp);
            thickScale += cloudExpand;
            lenScale = Math.max(thickScale * 1.15, lenScale * (1.0 - wakeMix * 0.25) + cloudExpand * 0.9);
        }

        if (!selected.airborne) {
            y = Math.max(0.05 + thickScale * 0.22, y);
        }

        return { x, y, z, lenScale, thickScale, wakeMix };
    }

    let clockTime = 0;
    function animate() {
        requestAnimationFrame(animate);

        const { selected, activeCd, speedKmh } = updateTelemetry();
        const speedNorm = Math.max(0.14, speedKmh / 180);
        const stepPuff = speedNorm * 0.0145;
        const stretchMode = smokeModes[currentSmokeModeIdx].stretch;
        clockTime += speedNorm * 0.036;

        for (let i = 0; i < puffCount; i++) {
            const p = puffData[i];
            p.progress += stepPuff * p.speedMult;
            if (p.progress > 1.0) p.progress -= 1.0;

            const t = p.progress;
            const cur = computeSmokePoint(p, t, selected, activeCd, clockTime, stretchMode);
            const nxt = computeSmokePoint(p, Math.min(1.0, t + 0.012), selected, activeCd, clockTime, stretchMode);

            const dx = Math.max(0.005, nxt.x - cur.x);
            const dy = nxt.y - cur.y;
            const dz = nxt.z - cur.z;

            const baseIdx3 = i * 3;
            const baseIdx2 = i * 2;

            aPos[baseIdx3] = cur.x;
            aPos[baseIdx3 + 1] = cur.y;
            aPos[baseIdx3 + 2] = cur.z;

            aFlowDir[baseIdx3] = dx;
            aFlowDir[baseIdx3 + 1] = dy;
            aFlowDir[baseIdx3 + 2] = dz;

            aScale[baseIdx2] = cur.lenScale;
            aScale[baseIdx2 + 1] = cur.thickScale;

            const fadeIn = Math.min(1.0, t / 0.05);
            const fadeOut = 1.0 - Math.max(0.0, (t - 0.70) / 0.30);
            aMeta[baseIdx3] = fadeIn * fadeOut * fadeOut;
            aMeta[baseIdx3 + 1] = p.phase + clockTime * p.spinDir * (0.4 + cur.wakeMix * 1.6);
            aMeta[baseIdx3 + 2] = cur.wakeMix;
        }

        attrPos.needsUpdate = true;
        attrFlowDir.needsUpdate = true;
        attrScale.needsUpdate = true;
        attrMeta.needsUpdate = true;

        renderer.render(scene, camera);
    }

    // 13. EVENT LISTENERS
    if (carSelect) {
        carSelect.addEventListener('change', () => {
            loadVehicleFromUrl(carSelect.value);
            updateTelemetry();
        });
    }

    if (drsToggle) {
        drsToggle.addEventListener('click', () => {
            isDrsActive = !isDrsActive;
            drsToggle.classList.toggle('active', isDrsActive);
            drsToggle.textContent = isDrsActive ? 'DRS ACTIVE // TUTUP SAYAP' : 'AKTIFKAN DRS (-15% DRAG)';
            if (drsBadge) drsBadge.textContent = isDrsActive ? 'DRS: OPEN [ACTIVE]' : 'DRS: STANDBY';
            updateTelemetry();
        });
    }

    if (speedRange) speedRange.addEventListener('input', updateTelemetry);

    window.addEventListener('resize', () => {
        const newW = container.clientWidth || 680;
        const newH = container.clientHeight || 460;
        camera.aspect = newW / newH;
        camera.updateProjectionMatrix();
        renderer.setSize(newW, newH);
    });

    loadVehicleFromUrl(carSelect ? carSelect.value : 'motogp');
    animate();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAirShaper3DFileStudio);
} else {
    initAirShaper3DFileStudio();
}
