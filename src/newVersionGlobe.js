/**
 * Created by ss on 2018/1/8.
 */

/**
 * Created by ss on 2018/1/2.
 */
Globe = function (container) {

    var mapIndexedImage;
    var mapOutlineImage;

    var camera, scene, renderer;

    var light1, light2;

    var rotating;

    var lookupCanvas;
    var lookupTexture;

    var mapUniforms;

    var sphere;

    var inputData;

    this.addData = function (data) {
        inputData = JSON.parse(JSON.stringify(data));
    };

    this.init = function () {
        mapIndexedImage = new Image();
        mapIndexedImage.src = '../assets/images/map_indexed.png';
        mapIndexedImage.onload = function () {
            mapOutlineImage = new Image();
            mapOutlineImage.src = '../assets/images/map_outline.png';
            mapOutlineImage.onload = function () {
                initScene();
                console.log('scene====', scene);
                animate();
            };
        };
    };

    function initScene() {

        buildDataVizGeometries();

        //	-----------------------------------------------------------------------------
        //	Let's make a scene
        scene = new THREE.Scene();

        //这句话不知道为什么,到时候再研究
        // scene.matrixAutoUpdate = false;
        // scene.fog = new THREE.FogExp2( 0xBBBBBB, 0.00003 );

        scene.add(new THREE.AmbientLight(0x505050));

        light1 = new THREE.SpotLight(0xeeeeee, 3);
        light1.position.x = 730;
        light1.position.y = 520;
        light1.position.z = 626;
        light1.castShadow = true;
        scene.add(light1);

        light2 = new THREE.PointLight(0x222222, 14.8);
        light2.position.x = -640;
        light2.position.y = -500;
        light2.position.z = -1000;
        scene.add(light2);

        rotating = new THREE.Object3D();
        scene.add(rotating);

        lookupCanvas = document.createElement('canvas');
        lookupCanvas.width = 256;
        lookupCanvas.height = 1;

        //为什么传入了一个canvas？
        lookupTexture = new THREE.Texture(lookupCanvas);
        lookupTexture.magFilter = THREE.NearestFilter;
        lookupTexture.minFilter = THREE.NearestFilter;
        lookupTexture.needsUpdate = true;

        var indexedMapTexture = new THREE.Texture(mapIndexedImage);
        //THREE.ImageUtils.loadTexture( 'images/map_indexed.png' );
        indexedMapTexture.needsUpdate = true;
        indexedMapTexture.magFilter = THREE.NearestFilter;
        indexedMapTexture.minFilter = THREE.NearestFilter;

        var outlinedMapTexture = new THREE.Texture(mapOutlineImage);
        outlinedMapTexture.needsUpdate = true;
        // outlinedMapTexture.magFilter = THREE.NearestFilter;
        // outlinedMapTexture.minFilter = THREE.NearestFilter;

        var uniforms = {
            'mapIndex': {type: 't', value: 0, texture: indexedMapTexture},
            'lookup': {type: 't', value: 1, texture: lookupTexture},
            'outline': {type: 't', value: 2, texture: outlinedMapTexture},
            'outlineLevel': {type: 'f', value: 1},
	        'color': { type: 'v3', value: new THREE.Vector3(0.0, 1.0, 1.0) },
	        'flag': { type: 'f', value: 1 }
        };

        mapUniforms = uniforms;

        var shaderMaterial = new THREE.ShaderMaterial({

            uniforms: uniforms,
            // attributes:     attributes,
            vertexShader: document.getElementById('globeVertexShader').textContent,
            fragmentShader: document.getElementById('globeFragmentShader').textContent,
            // sizeAttenuation: true,
        });

        sphere = new THREE.Mesh(new THREE.SphereGeometry(100, 40, 40), shaderMaterial);
        // sphere.receiveShadow = true;
        // sphere.castShadow = true;
        sphere.doubleSided = false;
        sphere.rotation.x = Math.PI;
        sphere.rotation.y = -Math.PI / 2;
        sphere.rotation.z = Math.PI;
        sphere.id = "base";
        rotating.add(sphere);

        //create visualization mesh, add it to rotating object
        visualizationMesh = new THREE.Object3D();
        rotating.add(visualizationMesh);

        var lines = getVisualizedMesh();
        visualizationMesh.add(lines);

        //	-----------------------------------------------------------------------------
        //	Setup our renderer
        var sceneArea = document.createElement("canvas");
        sceneArea.style.backgroundColor = "#000000";
        renderer = new THREE.WebGLRenderer({canvas: sceneArea, antialias: false});
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.autoClear = false;

        renderer.sortObjects = false;
        renderer.generateMipmaps = false;

        container.appendChild(renderer.domElement);

        //	-----------------------------------------------------------------------------
        //	Setup our camera
        camera = new THREE.PerspectiveCamera(12, window.innerWidth / window.innerHeight, 1, 20000);
        camera.position.z = 1400;
        camera.position.y = 0;
        camera.lookAt(scene.width / 2, scene.height / 2);
        scene.add(camera);

        rotateToTargetCountry();
        highlightCountry(96);

        sceneArea.addEventListener('mousemove', onDocumentMouseMove, true);
        sceneArea.addEventListener('mousedown', onDocumentMouseDown, true);
        sceneArea.addEventListener('mouseup', onDocumentMouseUp, false);
        sceneArea.addEventListener('click', onClick, true);
        sceneArea.addEventListener( 'mousewheel', onMouseWheel, false );

    }

    var mouseX = 0, mouseY = 0, pmouseX = 0, pmouseY = 0;
    var pressX = 0, pressY = 0;

    var dragging = false;

    function onDocumentMouseMove(event) {

        pmouseX = mouseX;
        pmouseY = mouseY;

        mouseX = event.clientX - window.innerWidth * 0.5;
        mouseY = event.clientY - window.innerHeight * 0.5;

        if (dragging) {
            rotateVY += (mouseX - pmouseX) / 2 * Math.PI / 180 * 0.3;
            rotateVX += (mouseY - pmouseY) / 2 * Math.PI / 180 * 0.3;
        }
    }

    function onDocumentMouseDown(event) {
        if (event.target.className.indexOf('noMapDrag') !== -1) {
            return;
        }
        dragging = true;
        pressX = mouseX;
        pressY = mouseY;
        rotateTargetX = undefined;
    }

    function onDocumentMouseUp(event) {

        dragging = false;
    }

    function onMouseWheel( event ){
        var delta = 0;

        if (event.wheelDelta) { /* IE/Opera. */
            delta = event.wheelDelta/120;
        }
        //	firefox
        else if( event.detail ){
            delta = -event.detail/3;
        }

        if (delta)
            handleMWheel(delta);

        event.returnValue = false;
    }

    function handleMWheel( delta ) {
        camera.scale.z += delta * 0.1;
        camera.scale.z = constrain( camera.scale.z, 0.7, 5.0 );
    }

    var rotateX = 0, rotateY = 0;
    var rotateVX = 0, rotateVY = 0;
    var rotateTargetX = undefined;
    var rotateTargetY = undefined;
    var rotateXMax = 90 * Math.PI / 180;

    function animate() {

        if (rotateTargetX !== undefined && rotateTargetY !== undefined) {

            rotateVX += (rotateTargetX - rotateX) * 0.012;
            rotateVY += (rotateTargetY - rotateY) * 0.012;

            if (Math.abs(rotateTargetX - rotateX) < 0.1 && Math.abs(rotateTargetY - rotateY) < 0.1) {
                rotateTargetX = undefined;
                rotateTargetY = undefined;
            }
        }

        rotateX += rotateVX;
        rotateY += rotateVY;

        //rotateY = wrap( rotateY, -Math.PI, Math.PI );

        rotateVX *= 0.98;
        rotateVY *= 0.98;

        if (dragging || rotateTargetX !== undefined) {
            rotateVX *= 0.6;
            rotateVY *= 0.6;
        }

        // rotateY += controllers.spin * 0.01;

        //	constrain the pivot up/down to the poles
        //	force a bit of bounce back action when hitting the poles
        if (rotateX < -rotateXMax) {
            rotateX = -rotateXMax;
            rotateVX *= -0.95;
        }
        if (rotateX > rotateXMax) {
            rotateX = rotateXMax;
            rotateVX *= -0.95;
        }

        rotating.rotation.x = rotateX;
        rotating.rotation.y = rotateY;


        renderer.clear();
        renderer.render(scene, camera);

        requestAnimationFrame(animate);

        THREE.SceneUtils.traverseHierarchy(rotating,
            function (mesh) {
                if (mesh.update !== undefined) {
                    mesh.update();
                }
            }
        );
    }

    function onClick() {

        //	make the rest not work if the event was actually a drag style click
        if (Math.abs(pressX - mouseX) > 3 || Math.abs(pressY - mouseY) > 3)
            return;

        var pickColorIndex = getPickColor();
        //	find it
        // for( var i in countryColorMap ){
        //     var countryCode = i;
        //     var countryColorIndex = countryColorMap[i];
        //     if( pickColorIndex == countryColorIndex ){
        //         // console.log("selecting code " + countryCode);
        //         var countryName = countryLookup[countryCode];
        //         // console.log("converts to " + countryName);
        //         if( countryName === undefined )
        //             return;
        //         if( $.inArray(countryName, selectableCountries) <= -1 )
        //             return;
        //         // console.log(countryName);
        //         var selection = selectionData;
        //         selection.selectedCountry = countryName;
        //         selectVisualization( timeBins, selection.selectedYear, [selection.selectedCountry], selection.getExportCategories(), selection.getImportCategories() );
        //         // console.log('selecting ' + countryName + ' from click');
        //         return;
        //     }
        // }

        console.log(pickColorIndex);

        if (pickColorIndex != 0) {
            highlightCountry(pickColorIndex);

            selectedCountry = countryData[reversedCountryColorMap[pickColorIndex]];

            rotateToTargetCountry();
        }


        // clickCountry();
    }

    function clickCountry() {

        //update parameters

        // highlightCountry();
        generateLines();
        generatePartial();
        initMarker();
    }

    function generateLines() {

    }

    function generatePartial() {

    }

    function initMarker() {

    }

    function highlightCountry(code) {

        var ctx = lookupCanvas.getContext('2d');
        ctx.clearRect(0, 0, 256, 1);

        var oceanFill = 10;
        ctx.fillStyle = 'rgb(' + oceanFill + ',' + oceanFill + ',' + oceanFill +')';
        ctx.fillRect( 0, 0, 1, 1 );

        var fillCSS = '#eeeeee';

        ctx.fillStyle = fillCSS;
        ctx.fillRect(code, 0, 1, 1);

        lookupTexture.needsUpdate = true;
    }

    function getPickColor() {

        var ctx = lookupCanvas.getContext('2d');
        ctx.clearRect(0, 0, 256, 1);

        var oceanFill = 0;
        ctx.fillStyle = 'rgb(' + oceanFill + ',' + oceanFill + ',' + oceanFill +')';
        ctx.fillRect( 0, 0, 1, 1 );

        mapUniforms['outlineLevel'].value = 0;
	    mapUniforms['flag'].value = 0;
        lookupTexture.needsUpdate = true;

        renderer.autoClear = false;
        renderer.autoClearColor = false;
        renderer.autoClearDepth = false;
        renderer.autoClearStencil = false;

        renderer.clear();
        renderer.render(scene, camera);

        var gl = renderer.context;
        gl.preserveDrawingBuffer = true;

        var mx = ( mouseX + renderer.context.canvas.width / 2 );//(mouseX + renderer.context.canvas.width/2) * 0.25;
        var my = ( -mouseY + renderer.context.canvas.height / 2 );//(-mouseY + renderer.context.canvas.height/2) * 0.25;
        mx = Math.floor(mx);
        my = Math.floor(my);

        var buf = new Uint8Array(4);
        // console.log(buf);
        gl.readPixels(mx, my, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, buf);
        // console.log(buf);

        renderer.autoClear = true;
        renderer.autoClearColor = true;
        renderer.autoClearDepth = true;
        renderer.autoClearStencil = true;

        gl.preserveDrawingBuffer = false;

        mapUniforms['outlineLevel'].value = 1;
	    mapUniforms['flag'].value = 1;
        return buf[0];
    }

    var visualizationMesh;

    function buildDataVizGeometries() {

        for (var s in inputData) {
            var set = inputData[s];

            var exporterName = set.e.toUpperCase();
            var importerName = set.i.toUpperCase();

            var exporter = countryData[exporterName];
            var importer = countryData[importerName];

            set.lineGeometry = makeConnectionLineGeometry(exporter, importer, set.v);
        }
    }

    var vec3_origin = new THREE.Vector3(0, 0, 0);

    function makeConnectionLineGeometry(exporter, importer, value) {

        console.log("making connection between " + exporter.name + " and " + importer.name);

        var distanceBetweenCountryCenter = exporter.center.clone().subSelf(importer.center).length();

        var start = exporter.center;
        var end = importer.center;

        var mid = start.clone().lerpSelf(end, 0.5);
        var midLength = mid.length();
        mid.normalize();
        mid.multiplyScalar(midLength + distanceBetweenCountryCenter * 0.7);

        var normal = (new THREE.Vector3()).sub(start, end);
        normal.normalize();

        var distanceHalf = distanceBetweenCountryCenter * 0.5;

        var startAnchor = start;
        var midStartAnchor = mid.clone().addSelf(normal.clone().multiplyScalar(distanceHalf));
        var midEndAnchor = mid.clone().addSelf(normal.clone().multiplyScalar(-distanceHalf));
        var endAnchor = end;

        var splineCurveA = new THREE.CubicBezierCurve3(start, startAnchor, midStartAnchor, mid);
        var splineCurveB = new THREE.CubicBezierCurve3(mid, midEndAnchor, endAnchor, end);

        var vertexCountDesired = Math.floor(distanceBetweenCountryCenter * 0.02 + 6) * 2;

        var points = splineCurveA.getPoints(vertexCountDesired);

        points = points.splice(0, points.length - 1);
        points = points.concat(splineCurveB.getPoints(vertexCountDesired));
        points.push(vec3_origin);

        var val = value * 0.0003;
        var size = (10 + Math.sqrt(val));
        size = constrain(size, 0.1, 60);

        var curveGeometry = new THREE.Geometry();
        for (var i = 0; i < points.length; i++) {
            curveGeometry.vertices.push(points[i]);
        }
        curveGeometry.size = size;

        return curveGeometry;
    }

    var exportColor = 0xdd380c;
    var importColor = 0x154492;

    function getVisualizedMesh() {

        var linesGeo = new THREE.Geometry();
        var lineColors = [];

        var particlesGeo = new THREE.Geometry();
        var particleColors = [];

        for (var i in inputData) {
            var set = inputData[i];

            var lineColor = new THREE.Color(exportColor);

            var lastColor;
            for (s in set.lineGeometry.vertices) {
                lineColors.push(lineColor);
                lastColor = lineColor;
            }

            THREE.GeometryUtils.merge(linesGeo, set.lineGeometry);

            var particleColor = lastColor.clone();
            var points = set.lineGeometry.vertices;
            var particleCount = Math.floor(set.v / 8000 / set.lineGeometry.vertices.length) + 1;
            particleCount = constrain(particleCount, 1, 100);
            var particleSize = set.lineGeometry.size;
            for (var s = 0; s < particleCount; s++) {

                var desiredIndex = s / particleCount * points.length;
                var rIndex = constrain(Math.floor(desiredIndex), 0, points.length - 1);

                var point = points[rIndex];
                var particle = point.clone();
                particle.moveIndex = rIndex;
                particle.nextIndex = rIndex + 1;
                if (particle.nextIndex >= points.length)
                    particle.nextIndex = 0;
                particle.lerpN = 0;
                particle.path = points;
                particlesGeo.vertices.push(particle);
                particle.size = particleSize;
                particleColors.push(particleColor);
            }

        }

        linesGeo.colors = lineColors;

        var splineOutline = new THREE.Line(linesGeo, new THREE.LineBasicMaterial(
            {
                color: 0xffffff,
                opacity: 1.0,
                blending: THREE.AdditiveBlending,
                transparent: true,
                depthWrite: false,
                vertexColors: true,
                linewidth: 1
            })
        );

        splineOutline.renderDepth = false;


        var attributes = {
            size: {type: 'f', value: []},
            customColor: {type: 'c', value: []}
        };

        var uniforms = {
            amplitude: {type: "f", value: 1.0},
            color: {type: "c", value: new THREE.Color(0xffffff)},
            texture: {type: "t", value: 0, texture: THREE.ImageUtils.loadTexture("../assets/images/particleA.png")},
        };

        var shaderMaterial = new THREE.ShaderMaterial({

            uniforms: uniforms,
            attributes: attributes,
            vertexShader: document.getElementById('vertexshader').textContent,
            fragmentShader: document.getElementById('fragmentshader').textContent,

            blending: THREE.AdditiveBlending,
            depthTest: true,
            depthWrite: false,
            transparent: true
        });

        particlesGeo.colors = particleColors;
        var pSystem = new THREE.ParticleSystem(particlesGeo, shaderMaterial);
        pSystem.dynamic = true;
        splineOutline.add(pSystem);

        var vertices = pSystem.geometry.vertices;
        var values_size = attributes.size.value;
        var values_color = attributes.customColor.value;

        for (var v = 0; v < vertices.length; v++) {
            values_size[v] = pSystem.geometry.vertices[v].size;
            values_color[v] = particleColors[v];
        }

        pSystem.update = function () {

            for (var i in this.geometry.vertices) {
                var particle = this.geometry.vertices[i];
                var path = particle.path;

                particle.lerpN += 0.05;
                if (particle.lerpN > 1) {
                    particle.lerpN = 0;
                    particle.moveIndex = particle.nextIndex;
                    particle.nextIndex++;
                    if (particle.nextIndex >= path.length) {
                        particle.moveIndex = 0;
                        particle.nextIndex = 1;
                    }
                }

                var currentPoint = path[particle.moveIndex];
                var nextPoint = path[particle.nextIndex];


                particle.copy(currentPoint);
                particle.lerpSelf(nextPoint, particle.lerpN);
            }
            this.geometry.verticesNeedUpdate = true;
        };

        return splineOutline;
    }

    function rotateToTargetCountry() {
        rotateTargetX = selectedCountry.lat * Math.PI/180;
        var targetY0 = -(selectedCountry.lon - 9) * Math.PI / 180;
        var piCounter = 0;
        while(true) {
            var targetY0Neg = targetY0 - Math.PI * 2 * piCounter;
            var targetY0Pos = targetY0 + Math.PI * 2 * piCounter;
            if(Math.abs(targetY0Neg - rotating.rotation.y) < Math.PI) {
                rotateTargetY = targetY0Neg;
                break;
            } else if(Math.abs(targetY0Pos - rotating.rotation.y) < Math.PI) {
                rotateTargetY = targetY0Pos;
                break;
            }
            piCounter++;
            rotateTargetY = wrap(targetY0, -Math.PI, Math.PI);
        }

        rotateVX *= 0.6;
        rotateVY *= 0.6;
    }

    function wrap(value, min, rangeSize) {
        rangeSize-=min;
        while (value < min) {
            value += rangeSize;
        }
        return value % rangeSize;
    }

    function constrain(v, min, max) {
        if (v < min)
            v = min;
        else if (v > max)
            v = max;
        return v;
    }

    function createCountryCenter() {

        var rad = 100;

        for (var s in countryData) {
            var country = countryData[s];

            var lon = country.lon - 90;
            var lat = country.lat;

            var phi = Math.PI / 2 - lat * Math.PI / 180 - Math.PI * 0.01;
            var theta = 2 * Math.PI - lon * Math.PI / 180 + Math.PI * 0.06;

            var center = new THREE.Vector3();
            center.x = Math.sin(phi) * Math.cos(theta) * rad;
            center.y = Math.cos(phi) * rad;
            center.z = Math.sin(phi) * Math.sin(theta) * rad;

            country.center = center;
        }
    }

    var reversedCountryColorMap = {
        '1': 'PE',
        '2': 'BF',
        '3': 'FR',
        '4': 'LY',
        '5': 'BY',
        '6': 'PK',
        '7': 'ID',
        '8': 'YE',
        '9': 'MG',
        '10': 'BO',
        '11': 'CI',
        '12': 'DZ',
        '13': 'CH',
        '14': 'CM',
        '15': 'MK',
        '16': 'BW',
        '17': 'UA',
        '18': 'KE',
        '19': 'TW',
        '20': 'JO',
        '21': 'MX',
        '22': 'AE',
        '23': 'BZ',
        '24': 'BR',
        '25': 'SL',
        '26': 'ML',
        '27': 'CD',
        '28': 'IT',
        '29': 'SO',
        '30': 'AF',
        '31': 'BD',
        '32': 'DO',
        '33': 'GW',
        '34': 'GH',
        '35': 'AT',
        '36': 'SE',
        '37': 'TR',
        '38': 'UG',
        '39': 'MZ',
        '40': 'JP',
        '41': 'NZ',
        '42': 'CU',
        '43': 'VE',
        '44': 'PT',
        '45': 'CO',
        '46': 'MR',
        '47': 'AO',
        '48': 'DE',
        '49': 'SD',
        '50': 'TH',
        '51': 'AU',
        '52': 'PG',
        '53': 'IQ',
        '54': 'HR',
        '55': 'GL',
        '56': 'NE',
        '57': 'DK',
        '58': 'LV',
        '59': 'RO',
        '60': 'ZM',
        '61': 'IR',
        '62': 'MM',
        '63': 'ET',
        '64': 'GT',
        '65': 'SR',
        '66': 'EH',
        '67': 'CZ',
        '68': 'TD',
        '69': 'AL',
        '70': 'FI',
        '71': 'SY',
        '72': 'KG',
        '73': 'SB',
        '74': 'OM',
        '75': 'PA',
        '76': 'AR',
        '77': 'GB',
        '78': 'CR',
        '79': 'PY',
        '80': 'GN',
        '81': 'IE',
        '82': 'NG',
        '83': 'TN',
        '84': 'PL',
        '85': 'NA',
        '86': 'ZA',
        '87': 'EG',
        '88': 'TZ',
        '89': 'GE',
        '90': 'SA',
        '91': 'VN',
        '92': 'RU',
        '93': 'HT',
        '94': 'BA',
        '95': 'IN',
        '96': 'CN',
        '97': 'CA',
        '98': 'SV',
        '99': 'GY',
        '100': 'BE',
        '101': 'GQ',
        '102': 'LS',
        '103': 'BG',
        '104': 'BI',
        '105': 'DJ',
        '106': 'AZ',
        '107': 'MY',
        '108': 'PH',
        '109': 'UY',
        '110': 'CG',
        '111': 'RS',
        '112': 'ME',
        '113': 'EE',
        '114': 'RW',
        '115': 'AM',
        '116': 'SN',
        '117': 'TG',
        '118': 'ES',
        '119': 'GA',
        '120': 'HU',
        '121': 'MW',
        '122': 'TJ',
        '123': 'KH',
        '124': 'KR',
        '125': 'HN',
        '126': 'IS',
        '127': 'NI',
        '128': 'CL',
        '129': 'MA',
        '130': 'LR',
        '131': 'NL',
        '132': 'CF',
        '133': 'SK',
        '134': 'LT',
        '135': 'ZW',
        '136': 'LK',
        '137': 'IL',
        '138': 'LA',
        '139': 'KP',
        '140': 'GR',
        '141': 'TM',
        '142': 'EC',
        '143': 'BJ',
        '144': 'SI',
        '145': 'NO',
        '146': 'MD',
        '147': 'LB',
        '148': 'NP',
        '149': 'ER',
        '150': 'US',
        '151': 'KZ',
        '152': 'AQ',
        '153': 'SZ',
        '154': 'UZ',
        '155': 'MN',
        '156': 'BT',
        '157': 'NC',
        '158': 'FJ',
        '159': 'KW',
        '160': 'TL',
        '161': 'BS',
        '162': 'VU',
        '163': 'FK',
        '164': 'GM',
        '165': 'QA',
        '166': 'JM',
        '167': 'CY',
        '168': 'PR',
        '169': 'PS',
        '170': 'BN',
        '171': 'TT',
        '172': 'CV',
        '173': 'PF',
        '174': 'WS',
        '175': 'LU',
        '176': 'KM',
        '177': 'MU',
        '178': 'FO',
        '179': 'ST',
        '180': 'AN',
        '181': 'DM',
        '182': 'TO',
        '183': 'KI',
        '184': 'FM',
        '185': 'BH',
        '186': 'AD',
        '187': 'MP',
        '188': 'PW',
        '189': 'SC',
        '190': 'AG',
        '191': 'BB',
        '192': 'TC',
        '193': 'VC',
        '194': 'LC',
        '195': 'YT',
        '196': 'VI',
        '197': 'GD',
        '198': 'MT',
        '199': 'MV',
        '200': 'KY',
        '201': 'KN',
        '202': 'MS',
        '203': 'BL',
        '204': 'NU',
        '205': 'PM',
        '206': 'CK',
        '207': 'WF',
        '208': 'AS',
        '209': 'MH',
        '210': 'AW',
        '211': 'LI',
        '212': 'VG',
        '213': 'SH',
        '214': 'JE',
        '215': 'AI',
        '216': 'MF_1_',
        '217': 'GG',
        '218': 'SM',
        '219': 'BM',
        '220': 'TV',
        '221': 'NR',
        '222': 'GI',
        '223': 'PN',
        '224': 'MC',
        '225': 'VA',
        '226': 'IM',
        '227': 'GU',
        '228': 'SG'
    };

    // 1. Sorted by country/region name abbreviation in ascending order
    // 2. 'colorCode' in fullCountryCode but not in reversedCountryColorMap is set to -1
    // 3. Some countries/regions do not have latitude/longitude information
    var countryData = {
        AD: {colorCode: 186, name: 'ANDORRA', lat: 42.5, lon: 1.6},
        AE: {colorCode: 22, name: 'UNITED ARAB EMIRATES', lat: 24, lon: 54},
        AF: {colorCode: 30, name: 'AFGHANISTAN', lat: 33, lon: 65},
        AG: {colorCode: 190, name: 'ANTIGUA AND BARBUDA', lat: 17.05, lon: -61.8},
        AI: {colorCode: 215, name: 'ANGUILLA', lat: 18.25, lon: -63.1667},
        AL: {colorCode: 69, name: 'ALBANIA', lat: 41, lon: 20},
        AM: {colorCode: 115, name: 'ARMENIA', lat: 40, lon: 45},
        AO: {colorCode: 47, name: 'ANGOLA', lat: -12.5, lon: 18.5},
        AQ: {colorCode: 152, name: 'ANTARCTICA', lat: -90, lon: 0},
        AR: {colorCode: 76, name: 'ARGENTINA', lat: -34, lon: -64},
        AS: {colorCode: 208, name: 'AMERICAN SAMOA', lat: -14.3333, lon: -170},
        AT: {colorCode: 35, name: 'AUSTRIA', lat: 47.3333, lon: 13.3333},
        AU: {colorCode: 51, name: 'AUSTRALIA', lat: -27, lon: 133},
        AW: {colorCode: 210, name: 'ARUBA', lat: 12.5, lon: -69.9667},
        AX: {colorCode: -1, name: 'ÅLAND ISLANDS'},
        AZ: {colorCode: 106, name: 'AZERBAIJAN', lat: 40.5, lon: 47.5},
        BA: {colorCode: 94, name: 'BOSNIA AND HERZEGOVINA', lat: 44, lon: 18},
        BB: {colorCode: 191, name: 'BARBADOS', lat: 13.1667, lon: -59.5333},
        BD: {colorCode: 31, name: 'BANGLADESH', lat: 24, lon: 90},
        BE: {colorCode: 100, name: 'BELGIUM', lat: 50.8333, lon: 4},
        BF: {colorCode: 2, name: 'BURKINA FASO', lat: 13, lon: -2},
        BG: {colorCode: 103, name: 'BULGARIA', lat: 43, lon: 25},
        BH: {colorCode: 185, name: 'BAHRAIN', lat: 26, lon: 50.55},
        BI: {colorCode: 104, name: 'BURUNDI', lat: -3.5, lon: 30},
        BJ: {colorCode: 143, name: 'BENIN', lat: 9.5, lon: 2.25},
        BL: {colorCode: 203, name: 'SAINT BARTHÉLEMY'},
        BM: {colorCode: 219, name: 'BERMUDA', lat: 32.3333, lon: -64.75},
        BN: {colorCode: 170, name: 'BRUNEI DARUSSALAM', lat: 4.5, lon: 114.6667},
        BO: {colorCode: 10, name: 'BOLIVIA, PLURINATIONAL STATE OF', lat: -17, lon: -65},
        BQ: {colorCode: -1, name: 'BONAIRE, SINT EUSTATIUS AND SABA'},
        BR: {colorCode: 24, name: 'BRAZIL', lat: -10, lon: -55},
        BS: {colorCode: 161, name: 'BAHAMAS', lat: 24.25, lon: -76},
        BT: {colorCode: 156, name: 'BHUTAN', lat: 27.5, lon: 90.5},
        BV: {colorCode: -1, name: 'BOUVET ISLAND', lat: -54.4333, lon: 3.4},
        BW: {colorCode: 16, name: 'BOTSWANA', lat: -22, lon: 24},
        BY: {colorCode: 5, name: 'BELARUS', lat: 53, lon: 28},
        BZ: {colorCode: 23, name: 'BELIZE', lat: 17.25, lon: -88.75},
        CA: {colorCode: 97, name: 'CANADA', lat: 60, lon: -95},
        CC: {colorCode: -1, name: 'COCOS (KEELING) ISLANDS', lat: -12.5, lon: 96.8333},
        CD: {colorCode: 27, name: 'CONGO, THE DEMOCRATIC REPUBLIC OF THE', lat: 0, lon: 25},
        CF: {colorCode: 132, name: 'CENTRAL AFRICAN REPUBLIC', lat: 7, lon: 21},
        CG: {colorCode: 110, name: 'CONGO', lat: -1, lon: 15},
        CH: {colorCode: 13, name: 'SWITZERLAND', lat: 47, lon: 8},
        CI: {colorCode: 11, name: 'CÔTE D\'IVOIRE', lat: 8, lon: -5},
        CK: {colorCode: 206, name: 'COOK ISLANDS', lat: -21.2333, lon: -159.7667},
        CL: {colorCode: 128, name: 'CHILE', lat: -30, lon: -71},
        CM: {colorCode: 14, name: 'CAMEROON', lat: 6, lon: 12},
        CN: {colorCode: 96, name: 'CHINA', lat: 35, lon: 105},
        CO: {colorCode: 45, name: 'COLOMBIA', lat: 4, lon: -72},
        CR: {colorCode: 78, name: 'COSTA RICA', lat: 10, lon: -84},
        CU: {colorCode: 42, name: 'CUBA', lat: 21.5, lon: -80},
        CV: {colorCode: 172, name: 'CAPE VERDE', lat: 16, lon: -24},
        CW: {colorCode: -1, name: 'CURAÇAO'},
        CX: {colorCode: -1, name: 'CHRISTMAS ISLAND', lat: -10.5, lon: 105.6667},
        CY: {colorCode: 167, name: 'CYPRUS', lat: 35, lon: 33},
        CZ: {colorCode: 67, name: 'CZECH REPUBLIC', lat: 49.75, lon: 15.5},
        DE: {colorCode: 48, name: 'GERMANY', lat: 51, lon: 9},
        DJ: {colorCode: 105, name: 'DJIBOUTI', lat: 11.5, lon: 43},
        DK: {colorCode: 57, name: 'DENMARK', lat: 56, lon: 10},
        DM: {colorCode: 181, name: 'DOMINICA', lat: 15.4167, lon: -61.3333},
        DO: {colorCode: 32, name: 'DOMINICAN REPUBLIC', lat: 19, lon: -70.6667},
        DZ: {colorCode: 12, name: 'ALGERIA', lat: 28, lon: 3},
        EC: {colorCode: 142, name: 'ECUADOR', lat: -2, lon: -77.5},
        EE: {colorCode: 113, name: 'ESTONIA', lat: 59, lon: 26},
        EG: {colorCode: 87, name: 'EGYPT', lat: 27, lon: 30},
        EH: {colorCode: 66, name: 'WESTERN SAHARA', lat: 24.5, lon: -13},
        ER: {colorCode: 149, name: 'ERITREA', lat: 15, lon: 39},
        ES: {colorCode: 118, name: 'SPAIN', lat: 40, lon: -4},
        ET: {colorCode: 63, name: 'ETHIOPIA', lat: 8, lon: 38},
        FI: {colorCode: 70, name: 'FINLAND', lat: 64, lon: 26},
        FJ: {colorCode: 158, name: 'FIJI', lat: -18, lon: 175},
        FK: {colorCode: 163, name: 'FALKLAND ISLANDS (MALVINAS)', lat: -51.75, lon: -59},
        FM: {colorCode: 184, name: 'MICRONESIA, FEDERATED STATES OF', lat: 6.9167, lon: 158.25},
        FO: {colorCode: 178, name: 'FAROE ISLANDS', lat: 62, lon: -7},
        FR: {colorCode: 3, name: 'FRANCE', lat: 46, lon: 2},
        GA: {colorCode: 119, name: 'GABON', lat: -1, lon: 11.75},
        GB: {colorCode: 77, name: 'UNITED KINGDOM', lat: 54, lon: -2},
        GD: {colorCode: 197, name: 'GRENADA', lat: 12.1167, lon: -61.6667},
        GE: {colorCode: 89, name: 'GEORGIA', lat: 42, lon: 43.5},
        GF: {colorCode: -1, name: 'FRENCH GUIANA', lat: 4, lon: -53},
        GG: {colorCode: 217, name: 'GUERNSEY', lat: 49.5, lon: -2.56},
        GH: {colorCode: 34, name: 'GHANA', lat: 8, lon: -2},
        GI: {colorCode: 222, name: 'GIBRALTAR', lat: 36.1833, lon: -5.3667},
        GL: {colorCode: 55, name: 'GREENLAND', lat: 72, lon: -40},
        GM: {colorCode: 164, name: 'GAMBIA', lat: 13.4667, lon: -16.5667},
        GN: {colorCode: 80, name: 'GUINEA', lat: 11, lon: -10},
        GP: {colorCode: -1, name: 'GUADELOUPE', lat: 16.25, lon: -61.5833},
        GQ: {colorCode: 101, name: 'EQUATORIAL GUINEA', lat: 2, lon: 10},
        GR: {colorCode: 140, name: 'GREECE', lat: 39, lon: 22},
        GS: {colorCode: -1, name: 'SOUTH GEORGIA AND THE SOUTH SANDWICH ISLANDS', lat: -54.5, lon: -37},
        GT: {colorCode: 64, name: 'GUATEMALA', lat: 15.5, lon: -90.25},
        GU: {colorCode: 227, name: 'GUAM', lat: 13.4667, lon: 144.7833},
        GW: {colorCode: 33, name: 'GUINEA-BISSAU', lat: 12, lon: -15},
        GY: {colorCode: 99, name: 'GUYANA', lat: 5, lon: -59},
        HK: {colorCode: -1, name: 'HONG KONG', lat: 22.25, lon: 114.1667},
        HM: {colorCode: -1, name: 'HEARD ISLAND AND MCDONALD ISLANDS', lat: -53.1, lon: 72.5167},
        HN: {colorCode: 125, name: 'HONDURAS', lat: 15, lon: -86.5},
        HR: {colorCode: 54, name: 'CROATIA', lat: 45.1667, lon: 15.5},
        HT: {colorCode: 93, name: 'HAITI', lat: 19, lon: -72.4167},
        HU: {colorCode: 120, name: 'HUNGARY', lat: 47, lon: 20},
        ID: {colorCode: 7, name: 'INDONESIA', lat: -5, lon: 120},
        IE: {colorCode: 81, name: 'IRELAND', lat: 53, lon: -8},
        IL: {colorCode: 137, name: 'ISRAEL', lat: 31.5, lon: 34.75},
        IM: {colorCode: 226, name: 'ISLE OF MAN', lat: 54.23, lon: -4.55},
        IN: {colorCode: 95, name: 'INDIA', lat: 20, lon: 77},
        IO: {colorCode: -1, name: 'BRITISH INDIAN OCEAN TERRITORY', lat: -6, lon: 71.5},
        IQ: {colorCode: 53, name: 'IRAQ', lat: 33, lon: 44},
        IR: {colorCode: 61, name: 'IRAN, ISLAMIC REPUBLIC OF', lat: 32, lon: 53},
        IS: {colorCode: 126, name: 'ICELAND', lat: 65, lon: -18},
        IT: {colorCode: 28, name: 'ITALY', lat: 42.8333, lon: 12.8333},
        JE: {colorCode: 214, name: 'JERSEY', lat: 49.21, lon: -2.13},
        JM: {colorCode: 166, name: 'JAMAICA', lat: 18.25, lon: -77.5},
        JO: {colorCode: 20, name: 'JORDAN', lat: 31, lon: 36},
        JP: {colorCode: 40, name: 'JAPAN', lat: 36, lon: 138},
        KE: {colorCode: 18, name: 'KENYA', lat: 1, lon: 38},
        KG: {colorCode: 72, name: 'KYRGYZSTAN', lat: 41, lon: 75},
        KH: {colorCode: 123, name: 'CAMBODIA', lat: 13, lon: 105},
        KI: {colorCode: 183, name: 'KIRIBATI', lat: 1.4167, lon: 173},
        KM: {colorCode: 176, name: 'COMOROS', lat: -12.1667, lon: 44.25},
        KN: {colorCode: 201, name: 'SAINT KITTS AND NEVIS', lat: 17.3333, lon: -62.75},
        KP: {colorCode: 139, name: 'KOREA, DEMOCRATIC PEOPLE\'S REPUBLIC OF', lat: 40, lon: 127},
        KR: {colorCode: 124, name: 'KOREA, REPUBLIC OF', lat: 37, lon: 127.5},
        KW: {colorCode: 159, name: 'KUWAIT', lat: 29.3375, lon: 47.6581},
        KY: {colorCode: 200, name: 'CAYMAN ISLANDS', lat: 19.5, lon: -80.5},
        KZ: {colorCode: 151, name: 'KAZAKHSTAN', lat: 48, lon: 68},
        LA: {colorCode: 138, name: 'LAO PEOPLE\'S DEMOCRATIC REPUBLIC', lat: 18, lon: 105},
        LB: {colorCode: 147, name: 'LEBANON', lat: 33.8333, lon: 35.8333},
        LC: {colorCode: 194, name: 'SAINT LUCIA', lat: 13.8833, lon: -61.1333},
        LI: {colorCode: 211, name: 'LIECHTENSTEIN', lat: 47.1667, lon: 9.5333},
        LK: {colorCode: 136, name: 'SRI LANKA', lat: 7, lon: 81},
        LR: {colorCode: 130, name: 'LIBERIA', lat: 6.5, lon: -9.5},
        LS: {colorCode: 102, name: 'LESOTHO', lat: -29.5, lon: 28.5},
        LT: {colorCode: 134, name: 'LITHUANIA', lat: 56, lon: 24},
        LU: {colorCode: 175, name: 'LUXEMBOURG', lat: 49.75, lon: 6.1667},
        LV: {colorCode: 58, name: 'LATVIA', lat: 57, lon: 25},
        LY: {colorCode: 4, name: 'LIBYA', lat: 25, lon: 17},
        MA: {colorCode: 129, name: 'MOROCCO', lat: 32, lon: -5},
        MC: {colorCode: 224, name: 'MONACO', lat: 43.7333, lon: 7.4},
        MD: {colorCode: 146, name: 'MOLDOVA, REPUBLIC OF', lat: 47, lon: 29},
        ME: {colorCode: 112, name: 'MONTENEGRO', lat: 42, lon: 19},
        MF: {colorCode: -1, name: 'SAINT MARTIN (FRENCH PART)'},
        MG: {colorCode: 9, name: 'MADAGASCAR', lat: -20, lon: 47},
        MH: {colorCode: 209, name: 'MARSHALL ISLANDS', lat: 9, lon: 168},
        MK: {colorCode: 15, name: 'MACEDONIA, THE FORMER YUGOSLAV REPUBLIC OF', lat: 41.8333, lon: 22},
        ML: {colorCode: 26, name: 'MALI', lat: 17, lon: -4},
        MM: {colorCode: 62, name: 'MYANMAR', lat: 22, lon: 98},
        MN: {colorCode: 155, name: 'MONGOLIA', lat: 46, lon: 105},
        MO: {colorCode: -1, name: 'MACAO', lat: 22.1667, lon: 113.55},
        MP: {colorCode: 187, name: 'NORTHERN MARIANA ISLANDS', lat: 15.2, lon: 145.75},
        MQ: {colorCode: -1, name: 'MARTINIQUE', lat: 14.6667, lon: -61},
        MR: {colorCode: 46, name: 'MAURITANIA', lat: 20, lon: -12},
        MS: {colorCode: 202, name: 'MONTSERRAT', lat: 16.75, lon: -62.2},
        MT: {colorCode: 198, name: 'MALTA', lat: 35.8333, lon: 14.5833},
        MU: {colorCode: 177, name: 'MAURITIUS', lat: -20.2833, lon: 57.55},
        MV: {colorCode: 199, name: 'MALDIVES', lat: 3.25, lon: 73},
        MW: {colorCode: 121, name: 'MALAWI', lat: -13.5, lon: 34},
        MX: {colorCode: 21, name: 'MEXICO', lat: 23, lon: -102},
        MY: {colorCode: 107, name: 'MALAYSIA', lat: 2.5, lon: 112.5},
        MZ: {colorCode: 39, name: 'MOZAMBIQUE', lat: -18.25, lon: 35},
        NA: {colorCode: 85, name: 'NAMIBIA', lat: -22, lon: 17},
        NC: {colorCode: 157, name: 'NEW CALEDONIA', lat: -21.5, lon: 165.5},
        NE: {colorCode: 56, name: 'NIGER', lat: 16, lon: 8},
        NF: {colorCode: -1, name: 'NORFOLK ISLAND', lat: -29.0333, lon: 167.95},
        NG: {colorCode: 82, name: 'NIGERIA', lat: 10, lon: 8},
        NI: {colorCode: 127, name: 'NICARAGUA', lat: 13, lon: -85},
        NL: {colorCode: 131, name: 'NETHERLANDS', lat: 52.5, lon: 5.75},
        NO: {colorCode: 145, name: 'NORWAY', lat: 62, lon: 10},
        NP: {colorCode: 148, name: 'NEPAL', lat: 28, lon: 84},
        NR: {colorCode: 221, name: 'NAURU', lat: -0.5333, lon: 166.9167},
        NU: {colorCode: 204, name: 'NIUE', lat: -19.0333, lon: -169.8667},
        NZ: {colorCode: 41, name: 'NEW ZEALAND', lat: -41, lon: 174},
        OM: {colorCode: 74, name: 'OMAN', lat: 21, lon: 57},
        PA: {colorCode: 75, name: 'PANAMA', lat: 9, lon: -80},
        PE: {colorCode: 1, name: 'PERU', lat: -10, lon: -76},
        PF: {colorCode: 173, name: 'FRENCH POLYNESIA', lat: -15, lon: -140},
        PG: {colorCode: 52, name: 'PAPUA NEW GUINEA', lat: -6, lon: 147},
        PH: {colorCode: 108, name: 'PHILIPPINES', lat: 13, lon: 122},
        PK: {colorCode: 6, name: 'PAKISTAN', lat: 30, lon: 70},
        PL: {colorCode: 84, name: 'POLAND', lat: 52, lon: 20},
        PM: {colorCode: 205, name: 'SAINT PIERRE AND MIQUELON', lat: 46.8333, lon: -56.3333},
        PN: {colorCode: 223, name: 'PITCAIRN', lat: -24.7, lon: -127.4},
        PR: {colorCode: 168, name: 'PUERTO RICO', lat: 18.25, lon: -66.5},
        PS: {colorCode: 169, name: 'PALESTINIAN TERRITORY, OCCUPIED', lat: 32, lon: 35.25},
        PT: {colorCode: 44, name: 'PORTUGAL', lat: 39.5, lon: -8},
        PW: {colorCode: 188, name: 'PALAU', lat: 7.5, lon: 134.5},
        PY: {colorCode: 79, name: 'PARAGUAY', lat: -23, lon: -58},
        QA: {colorCode: 165, name: 'QATAR', lat: 25.5, lon: 51.25},
        RE: {colorCode: -1, name: 'RÉUNION', lat: -21.1, lon: 55.6},
        RO: {colorCode: 59, name: 'ROMANIA', lat: 46, lon: 25},
        RS: {colorCode: 111, name: 'SERBIA', lat: 44, lon: 21},
        RU: {colorCode: 92, name: 'RUSSIAN FEDERATION', lat: 60, lon: 100},
        RW: {colorCode: 114, name: 'RWANDA', lat: -2, lon: 30},
        SA: {colorCode: 90, name: 'SAUDI ARABIA', lat: 25, lon: 45},
        SB: {colorCode: 73, name: 'SOLOMON ISLANDS', lat: -8, lon: 159},
        SC: {colorCode: 189, name: 'SEYCHELLES', lat: -4.5833, lon: 55.6667},
        SD: {colorCode: 49, name: 'SUDAN', lat: 15, lon: 30},
        SE: {colorCode: 36, name: 'SWEDEN', lat: 62, lon: 15},
        SG: {colorCode: 228, name: 'SINGAPORE', lat: 1.3667, lon: 103.8},
        SH: {colorCode: 213, name: 'SAINT HELENA, ASCENSION AND TRISTAN DA CUNHA', lat: -15.9333, lon: -5.7},
        SI: {colorCode: 144, name: 'SLOVENIA', lat: 46, lon: 15},
        SJ: {colorCode: -1, name: 'SVALBARD AND JAN MAYEN', lat: 78, lon: 20},
        SK: {colorCode: 133, name: 'SLOVAKIA', lat: 48.6667, lon: 19.5},
        SL: {colorCode: 25, name: 'SIERRA LEONE', lat: 8.5, lon: -11.5},
        SM: {colorCode: 218, name: 'SAN MARINO', lat: 43.7667, lon: 12.4167},
        SN: {colorCode: 116, name: 'SENEGAL', lat: 14, lon: -14},
        SO: {colorCode: 29, name: 'SOMALIA', lat: 10, lon: 49},
        SR: {colorCode: 65, name: 'SURINAME', lat: 4, lon: -56},
        SS: {colorCode: -1, name: 'SOUTH SUDAN'},
        ST: {colorCode: 179, name: 'SAO TOME AND PRINCIPE', lat: 1, lon: 7},
        SV: {colorCode: 98, name: 'EL SALVADOR', lat: 13.8333, lon: -88.9167},
        SX: {colorCode: -1, name: 'SINT MAARTEN (DUTCH PART)'},
        SY: {colorCode: 71, name: 'SYRIAN ARAB REPUBLIC', lat: 35, lon: 38},
        SZ: {colorCode: 153, name: 'SWAZILAND', lat: -26.5, lon: 31.5},
        TC: {colorCode: 192, name: 'TURKS AND CAICOS ISLANDS', lat: 21.75, lon: -71.5833},
        TD: {colorCode: 68, name: 'CHAD', lat: 15, lon: 19},
        TF: {colorCode: -1, name: 'FRENCH SOUTHERN TERRITORIES', lat: -43, lon: 67},
        TG: {colorCode: 117, name: 'TOGO', lat: 8, lon: 1.1667},
        TH: {colorCode: 50, name: 'THAILAND', lat: 15, lon: 100},
        TJ: {colorCode: 122, name: 'TAJIKISTAN', lat: 39, lon: 71},
        TK: {colorCode: -1, name: 'TOKELAU', lat: -9, lon: -172},
        TL: {colorCode: 160, name: 'TIMOR-LESTE', lat: -8.55, lon: 125.5167},
        TM: {colorCode: 141, name: 'TURKMENISTAN', lat: 40, lon: 60},
        TN: {colorCode: 83, name: 'TUNISIA', lat: 34, lon: 9},
        TO: {colorCode: 182, name: 'TONGA', lat: -20, lon: -175},
        TR: {colorCode: 37, name: 'TURKEY', lat: 39, lon: 35},
        TT: {colorCode: 171, name: 'TRINIDAD AND TOBAGO', lat: 11, lon: -61},
        TV: {colorCode: 220, name: 'TUVALU', lat: -8, lon: 178},
        TW: {colorCode: 19, name: 'TAIWAN', lat: 23.5, lon: 121},
        TZ: {colorCode: 88, name: 'TANZANIA, UNITED REPUBLIC OF', lat: -6, lon: 35},
        UA: {colorCode: 17, name: 'UKRAINE', lat: 49, lon: 32},
        UG: {colorCode: 38, name: 'UGANDA', lat: 1, lon: 32},
        UM: {colorCode: -1, name: 'UNITED STATES MINOR OUTLYING ISLANDS', lat: 19.2833, lon: 166.6},
        US: {colorCode: 150, name: 'UNITED STATES', lat: 38, lon: -97},
        UY: {colorCode: 109, name: 'URUGUAY', lat: -33, lon: -56},
        UZ: {colorCode: 154, name: 'UZBEKISTAN', lat: 41, lon: 64},
        VA: {colorCode: 225, name: 'HOLY SEE (VATICAN CITY STATE)', lat: 41.9, lon: 12.45},
        VC: {colorCode: 193, name: 'SAINT VINCENT AND THE GRENADINES', lat: 13.25, lon: -61.2},
        VE: {colorCode: 43, name: 'VENEZUELA, BOLIVARIAN REPUBLIC OF', lat: 8, lon: -66},
        VG: {colorCode: 212, name: 'VIRGIN ISLANDS, BRITISH', lat: 18.5, lon: -64.5},
        VI: {colorCode: 196, name: 'VIRGIN ISLANDS, U.S.', lat: 18.3333, lon: -64.8333},
        VN: {colorCode: 91, name: 'VIET NAM', lat: 16, lon: 106},
        VU: {colorCode: 162, name: 'VANUATU', lat: -16, lon: 167},
        WF: {colorCode: 207, name: 'WALLIS AND FUTUNA', lat: -13.3, lon: -176.2},
        WS: {colorCode: 174, name: 'SAMOA', lat: -13.5833, lon: -172.3333},
        YE: {colorCode: 8, name: 'YEMEN', lat: 15, lon: 48},
        YT: {colorCode: 195, name: 'MAYOTTE', lat: -12.8333, lon: 45.1667},
        ZA: {colorCode: 86, name: 'SOUTH AFRICA', lat: -29, lon: 24},
        ZM: {colorCode: 60, name: 'ZAMBIA', lat: -15, lon: 30},
        ZW: {colorCode: 135, name: 'ZIMBABWE', lat: -20, lon: 30}
    };

    var selectedCountry = countryData["CN"];

    createCountryCenter();
};