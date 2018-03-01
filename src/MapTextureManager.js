Potree.MapTextureManagerSettings = {
	tileServer: null
};

Potree.MapTextureManager = class MapTextureManager {
	constructor(projection, bbMin, bbMax) {
		this.projection = projection;
		this.bbMin = bbMin;
		this.bbMax = bbMax;
		this._mapCanvas = document.getElementById("texture");
		let ratio = (bbMax[0] - bbMin[0]) / (bbMax[1] - bbMin[1]);
		this._mapCanvas.width = 256 * ratio;
		this._mapCanvas.height = 256;

		this.updateWithTile();
	}

	get mapTexture() {
		let texture = new THREE.CanvasTexture(this._mapCanvas);
		texture.minFilter = THREE.LinearFilter;
		texture.needsUpdate = true;

		return texture;
	}

	updateWithTile() {
		var self = this;
		proj4.defs('test', this.projection);
		var swiss = proj4.defs("test");
		var WGS84 = proj4.defs("WGS84");

		var minWeb = proj4(swiss, WGS84, [this.bbMin[0], this.bbMin[1]]);
		var maxWeb = proj4(swiss, WGS84, [this.bbMax[0], this.bbMax[1]]);

		function long2tile(lon, zoom) { return (Math.floor((lon + 180) / 360 * Math.pow(2, zoom))); }
		function lat2tile(lat, zoom) { return (Math.floor((1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * Math.pow(2, zoom))); }

		function findZoomLevel(minCoord, maxCoord) {
			let zoom = 18;
			while (zoom > 1) {
				if (doesTileCoverBothCoord(minCoord, maxCoord, zoom)) {
					return zoom;
				}
				zoom--;
			}
			return zoom;
		}

		function doesTileCoverBothCoord(minCoord, maxCoord, zoom) {
			let X_min = long2tile(minCoord[0], zoom);
			let Y_min = lat2tile(minCoord[1], zoom);
			let X_max = long2tile(maxCoord[0], zoom);
			let Y_max = lat2tile(maxCoord[1], zoom);
			return (X_min === X_max && Y_min === Y_max);
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

		function calculateMaptile(minCoord, maxCoord) {
			let zoom = findZoomLevel(minCoord, maxCoord);
			let Tiles = getTiles(zoom, minCoord, maxCoord);
			return Tiles;
		}

		function getTiles(zoom, minCoord, maxCoord) {
			let minX = long2tile(minCoord[0], zoom);
			let minY = lat2tile(minCoord[1], zoom);
			let maxX = long2tile(maxCoord[0], zoom);
			let maxY = lat2tile(maxCoord[1], zoom);
			let arrayX = [minX, maxX].sort();
			let arrayY = [minY, maxY].sort();
			let tiles = [];
			for (var x = arrayX[0]; x <= arrayX[1]; x++) {
				for (var y = arrayY[0]; y <= arrayY[1]; y++) {
					tiles.push({ X: x, Y: y, zoom: zoom });
				}
			}
			return tiles;
		}

		function downloadImages(Tiles) {
			let promises = Tiles.map(function (tile, i) {
				return new Promise((resolve, reject) => {
					let image = new Image(256, 256);
					image.crossOrigin = "Anonymous";
					image.onload = function () {
						resolve({ tile: tile, image: image });
					}
					image.src = "https://tile.openstreetmap.org" + "/" + tile.zoom + "/" + tile.X + "/" + tile.Y + ".png";
				})
			});
			return Promise.all(promises).then(tileImages => tileImages);
		}

		function mergeImagesIntoOffscreenCanvas(tileImages) {
			let result = calculateDirection(tiles);
			// offscreenCanvas.width = 256 * result.tilesInXDirection;
			// offscreenCanvas.height = 256 * result.tilesInYDirection;
			for (let i = 0; i < images.length; i++) {
				drawTileOnCanvas(this._mapCanvas, tileImages, minWeb, maxWeb);
			}
			return offscreenCanvas;
		}

		function calculateDirection(tiles) {
			let tilesInXDirection = [...new Set(tiles.map(el => el.X))].length;
			let tilesInYDirection = [...new Set(tiles.map(el => el.Y))].length;

			return {
				tilesInXDirection: tilesInXDirection,
				tilesInYDirection: tilesInYDirection
			};

		}

		function drawTileOnCanvas(canvas, image, tile, minCoord, maxCoord) {
			let ctx = canvas.getContext("2d");
			let longTile = tile2long(tile.X, tile.zoom);
			let latTile = tile2lat(tile.Y, tile.zoom);
			let longTileToRight = tile2long(tile.X + 1, tile.zoom);
			let latTileBottom = tile2lat(tile.Y + 1, tile.zoom);
			let minTileCoord = [longTile, latTile];
			let height = [maxCoord[1] - minCoord[1], latTile - latTileBottom].sort().slice(-1)[0];
			let width = [maxCoord[0] - minCoord[0], longTile - longTileToRight].sort().slice(-1)[0];
			let dY = Math.floor(canvas.height * (maxCoord[1] - latTile) / height);
			let dX = Math.floor(canvas.width * (minCoord[0] - longTile) / width);
			let sY = Math.floor(image.height * (latTile - maxCoord[1]) / height);
			let sX = Math.floor(image.width * (longTile - minCoord[0]) / width);

			let northWestCord = [tile2long(tile.X, tile.zoom), tile2lat(tile.Y, tile.zoom)];
			let southEastCord = [tile2long(tile.X + 1, tile.zoom), tile2lat(tile.Y + 1, tile.zoom)];
			let SY1 = Math.floor(canvas.height * (northWestCord[1] - maxWeb[1]) / (northWestCord[1] - southEastCord[1]));
			let SX1 = Math.floor(256 * (northWestCord[0] - minWeb[0]) / (northWestCord[0] - southEastCord[0]));
			let dSouth = Math.floor(canvas.height * (minWeb[1] - southEastCord[1]) / (northWestCord[1] - southEastCord[1]));
			let dEast = Math.floor(256 * (maxWeb[0] - southEastCord[0]) / (northWestCord[0] - southEastCord[0]));
			debugger;
			// let sY = 0;
			// let sX = 0;
			ctx.drawImage(image, sX, sY, image.width, image.height, dX, dY, image.width, image.height);
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
			// let self = this;
			let Points = calculateMaptile(minWeb, maxWeb);
			let zoom = Points[0].zoom;
			downloadImages(Points).then(TileImages => {
				let canvasEl = self._mapCanvas;
				drawTileOnCanvas(canvasEl, TileImages[0].image, TileImages[0].tile, minWeb, maxWeb);
				// let ctx = canvasEl.getContext("2d");
				// let northWestCord = [tile2long(Points[0].X, zoom), tile2lat(Points[0].Y, zoom)];
				// let southEastCord = [tile2long(Points[0].X + 1, zoom), tile2lat(Points[0].Y + 1, zoom)];
				// let northEastInner = maxWeb;
				// let southWestInner = minWeb;
				// let dY = Math.floor(canvasEl.height * (northWestCord[1] - maxWeb[1]) / (northWestCord[1] - southEastCord[1]));
				// let dX = Math.floor(256 * (northWestCord[0] - minWeb[0]) / (northWestCord[0] - southEastCord[0]));
				// let dSouth = Math.floor(canvasEl.height * (minWeb[1] - southEastCord[1]) / (northWestCord[1] - southEastCord[1]));
				// let dEast = Math.floor(256 * (maxWeb[0] - southEastCord[0]) / (northWestCord[0] - southEastCord[0]));
				// let imageWidth = (256 - (dX + dEast))
				// let imageHeight = (256 - (dNorth + dY))
				// ctx.drawImage(TileImages[0].image, dX, dY, imageWidth, imageHeight, 0, 0, canvasEl.width, canvasEl.height);
				//ctx.drawImage(TileImages[0].image, 0, 0, canvasEl.width, canvasEl.height);

			});
		}

		getTexture();
	}
}
