Potree.MapTextureManagerSettings = {
	tileServer: null
};

Potree.MapTextureManager = class MapTextureManager {
	constructor(projection, bbMin, bbMax) {
		this.projection = projection;
		this.bbMin = bbMin;
		this.bbMax = bbMax;
		this._mapCanvas = document.createElement("canvas");
		this._mapCanvas.width = bbMax[0] - bbMin[0];
		this._mapCanvas.height = bbMax[1] - bbMin[1];
		let canvas = this._mapCanvas;
		let width = 100;
		let height = 100;
		canvas.width = width;
		canvas.height = height;

		let ctx = canvas.getContext("2d");
		ctx.fillStyle = "#FF0000";
		ctx.fillRect(0, 0, width, height);

		this.updateWithTile();
	}

	get mapTexture() {
		let texture = new THREE.CanvasTexture(this._mapCanvas);
		texture.minFilter = THREE.LinearFilter;
		texture.needsUpdate = true;

		return texture;
	}

	updateWithTile() {
		let self = this;
		proj4.defs('test', this.projection);
		var swiss = proj4.defs("test");
		var WGS84 = proj4.defs("WGS84");

		var minWeb = proj4(swiss, WGS84, [this.bbMin[0], this.bbMin[1]]);
		var maxWeb = proj4(swiss, WGS84, [this.bbMax[0], this.bbMax[1]]);

		function long2tile(lon, zoom) { return (Math.floor((lon + 180) / 360 * Math.pow(2, zoom))); }
		function lat2tile(lat, zoom) { return (Math.floor((1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * Math.pow(2, zoom))); }

		function findZoomLevel(cord1, cord2, numberOfXPixel, numberOfYPixel) {
			let lat1 = cord1[1];
			let lon1 = cord1[0];
			let lat2 = cord2[1];
			let lon2 = cord2[0];
			let dLat = lat2 - lat1;
			let dLon = lon2 - lon1;
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

		function calculateMaptile(topCorner, lowerConer) {
			let zoom = findZoomLevel(minWeb, maxWeb, 256, 256);
			var center = [(maxWeb[0] + minWeb[0]) / 2, (maxWeb[1] + minWeb[1]) / 2];

			let X = long2tile(center[0], zoom);
			let Y = lat2tile(center[1], zoom);
			return {
				x: X,
				y: Y,
				zoom: zoom
			};
		}

		function tile2long(x, z) {
			return (x / Math.pow(2, z) * 360 - 180);
		}
		function tile2lat(y, z) {
			var n = Math.PI - 2 * Math.PI * y / Math.pow(2, z);
			return (180 / Math.PI * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n))));
		}

		var baseUrl = "https://tile.openstreetmap.org";

		function getTexture() {
			let image = new Image(256, 256);
			let result = calculateMaptile(minWeb, maxWeb);
			let X = result.x;
			let Y = result.y;
			let zoom = result.zoom;
			image.crossOrigin = "Anonymous";
			image.onload = function () {
				let canvasEl = self._mapCanvas;
				canvasEl.width = 256;
				canvasEl.height = 256;
				// gl = canvasEl.getContext("webgl");
				// gl = WebGLDebugUtils.makeDebugContext(gl, throwOnGLError, logAndValidate);
				let ctx = canvasEl.getContext("2d");
				let northWestCord = [tile2long(X, zoom), tile2lat(Y, zoom)];
				let southEastCord = [tile2long(X + 1, zoom), tile2lat(Y + 1, zoom)];
				let dNorth = Math.floor(canvasEl.height * (northWestCord[1] - minWeb[1]) / (northWestCord[1] - southEastCord[1]));
				let dWest = Math.floor(canvasEl.width * (northWestCord[0] - minWeb[0]) / (northWestCord[0] - southEastCord[0]));
				let dSouth = Math.floor(canvasEl.height * (maxWeb[1] - southEastCord[1]) / (northWestCord[1] - southEastCord[1]));
				let dEast = Math.floor(canvasEl.width * (maxWeb[0] - southEastCord[0]) / (northWestCord[0] - southEastCord[0]));
				ctx.drawImage(image, dWest, dNorth, (canvasEl.width - (dWest + dEast)), (canvasEl.height - (dNorth + dSouth)), 0, 0, canvasEl.width, canvasEl.height);

			}
			// console.log("https://tile.openstreetmap.org" + "/" + zoom + "/" + X + "/" + Y + ".png");
			image.src = "https://tile.openstreetmap.org" + "/" + zoom + "/" + X + "/" + Y + ".png";
		}

		getTexture();
	}

	

}
