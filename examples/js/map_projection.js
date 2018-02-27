(function () {

	// add EPSG:21781 to the proj4 projection database
	proj4.defs('EPSG:21781', "+proj=somerc +lat_0=46.95240555555556 +lon_0=7.439583333333333 +k_0=1 +x_0=600000 +y_0=200000 +ellps=bessel +towgs84=674.4,15.1,405.3,0,0,0,0 +units=m +no_defs ");
	var swiss = proj4.defs("EPSG:21781");
	var WGS84 = proj4.defs("WGS84");
	var webMercator = proj4.defs("EPSG:3857");

	// extent of the point cloud (with altitude) in EPSG:21781 / Swiss Coordinate System
	var minSwiss = [589500, 231300, 722.505];
	var maxSwiss = [590099, 231565.743, 776.459];

	// extent in EPSG:3857 / WGS84 Web Mercator 
	var minWeb = proj4(swiss, WGS84, [minSwiss[0], minSwiss[1]]);
	var maxWeb = proj4(swiss, WGS84, [maxSwiss[0], maxSwiss[1]]);

	window.viewer = new Potree.Viewer(document.getElementById("potree_render_area"));

	viewer.setEDLEnabled(true);
	viewer.setFOV(60);
	viewer.setPointBudget(1 * 1000 * 1000);
	viewer.loadSettingsFromURL();
	viewer.setDescription("Point cloud courtesy of <a target='_blank' href='https://www.sigeom.ch/'>sigeom sa</a>");
	getTexture().then(texture => {
		// Load and add point cloud to scene
		Potree.loadPointCloud("../../pointclouds/vol_total/cloud.js", "sigeom.sa", e => {
			let scene = viewer.scene;
			let pointcloud = e.pointcloud;

			let material = pointcloud.material;
			material.size = 1;
			material.pointSizeType = Potree.PointSizeType.ADAPTIVE;
			material.pointColorType = Potree.PointColorType.MAP;
			material.shape = Potree.PointShape.SQUARE;
			material.texture = texture;
			material.interpolate = true;
			material.updateShaderSource();
			window.loadedTexture = material.texture;

			pointcloud.updateMatrixWorld();

			scene.addPointCloud(pointcloud);
			viewer.fitToScreen();
		});

	});
	function logAndValidate(functionName, args) {
		logGLCall(functionName, args);
		validateNoneOfTheArgsAreUndefined(functionName, args);
	}

	function throwOnGLError(err, funcName, args) {
		throw WebGLDebugUtils.glEnumToString(err) + " was caused by call to: " + funcName;
	};



	function long2tile(lon, zoom) { return (Math.floor((lon + 180) / 360 * Math.pow(2, zoom))); }
	function lat2tile(lat, zoom) { return (Math.floor((1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * Math.pow(2, zoom))); }

	function findZoomLevel(cord1, cord2, numberOfXPixel, numberOfYPixel) {
		let lat1 = cord1[1];
		let lon1 = cord1[0];
		let lat2 = cord2[1];
		let lon2 = cord2[0];
		dLat = lat2 - lat1;
		dLon = lon2 - lon1;
		debugger;
		let distance = CalcDistanceBetween(lat1, lon1, lat2, lon2);
		let meterPrPixel = distance / (Math.sqrt(Math.pow(numberOfXPixel, 2) + (dLat / dLon * Math.pow(numberOfYPixel, 2))));

		let zoom = 0;
		let pixelLength = 156543.03;
		while (pixelLength / 2 > meterPrPixel) {
			pixelLength = Math.abs(156543.03 * Math.cos(lat2)) / Math.pow(2, zoom);
			zoom++;
		}
		zoom--;
		zoom--;

		return zoom;
	}

	function CalcDistanceBetween(lat1, lon1, lat2, lon2) {
		//Radius of the earth in:  1.609344 miles,  6371 km  | var R = (6371 / 1.609344);
		var R = 3958.7558657440545; // Radius of earth in Miles 
		var dLat = toRad(lat2 - lat1);
		var dLon = toRad(lon2 - lon1);
		var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
			Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
			Math.sin(dLon / 2) * Math.sin(dLon / 2);
		var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
		var d = 1000 * R * c;
		return d;
	}

	function toRad(Value) {
		/** Converts numeric degrees to radians */
		return Value * Math.PI / 180;
	}

	function calculateMaptile(baseUrl) {
		let zoom = findZoomLevel(minWeb, maxWeb, 256, 256);
		var center = [(maxWeb[0] + minWeb[0]) / 2, (maxWeb[1] + minWeb[1]) / 2];
		let testLong = tile2lat(63, 7);
		let testLat = tile2lat(42, 7);
		let X = long2tile(center[0], zoom);
		let Y = lat2tile(center[1], zoom);
		debugger;
		return baseUrl + "/" + zoom + "/" + X + "/" + Y + ".png"
	}

	function tile2long(x, z) {
		return (x / Math.pow(2, z) * 360 - 180);
	}
	function tile2lat(y, z) {
		var n = Math.PI - 2 * Math.PI * y / Math.pow(2, z);
		return (180 / Math.PI * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n))));
	}

	function getTexture() {
		return new Promise((resolve, reject) => {
			let image = new Image(256, 256);
			image.crossOrigin = "Anonymous";
			image.onload = function () {
				let canvasEl = document.getElementById("texture");
				canvasEl.width = 256;
				canvasEl.height = 256;
				// gl = canvasEl.getContext("webgl");
				// gl = WebGLDebugUtils.makeDebugContext(gl, throwOnGLError, logAndValidate);
				let ctx = canvasEl.getContext("2d");
				ctx.drawImage(this, 0, 0);
				let texture = new THREE.CanvasTexture(canvasEl);
				texture.minFilter = THREE.LinearFilter;
				texture.needsUpdate = true;

				return resolve(texture);
			}
			image.src = calculateMaptile("https://tile.openstreetmap.org");
		});
	}
})();
