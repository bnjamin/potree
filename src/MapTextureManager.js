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
		let ctx = this._mapCanvas.getContext("2d");
		ctx.rect(0, 0, this._mapCanvas.width, this._mapCanvas.height);
		ctx.fillStyle = "red";
		ctx.fill();
		proj4.defs('test', this.projection);
		var swiss = proj4.defs("test");
		var WGS84 = proj4.defs("WGS84");

		this._minWeb = proj4(swiss, WGS84, [this.bbMin[0], this.bbMin[1]]);
		this._maxWeb = proj4(swiss, WGS84, [this.bbMax[0], this.bbMax[1]]);
		this.updateTexture(this._minWeb, this._maxWeb);
	}

	updateTexture(minWeb, maxWeb) {
		let canvasEl = this._mapCanvas;
		let tiles = this.getTiles(minWeb, maxWeb);
		let tilePromises = this.tilePromisesFor(tiles);
		tilePromises.forEach(tilePromise => {
			tilePromise.then(tileImage => {
				this.drawTileOnCanvas(canvasEl, tileImage.image, tileImage.tile, minWeb, maxWeb);
			});
		});
	}

	get mapTexture() {
		let texture = new THREE.CanvasTexture(this._mapCanvas);
		texture.minFilter = THREE.LinearFilter;
		texture.needsUpdate = true;

		return texture;
	}

	long2tile(lon, zoom) { return (Math.floor((lon + 180) / 360 * Math.pow(2, zoom))); }
	lat2tile(lat, zoom) { return (Math.floor((1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * Math.pow(2, zoom))); }

	long2tileDouble(lon, zoom) { return (((lon + 180) / 360 * Math.pow(2, zoom))); }
	lat2tileDouble(lat, zoom) { return (((1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * Math.pow(2, zoom))); }

	getTiles(minCoord, maxCoord, zoom=1) {
		let maxZoom = 18;
		let minNumberOfTiles = 4;
		let minX = this.long2tile(minCoord[0], zoom);
		let minY = this.lat2tile(minCoord[1], zoom);
		let maxX = this.long2tile(maxCoord[0], zoom);
		let maxY = this.lat2tile(maxCoord[1], zoom);
		let arrayX = [minX, maxX].sort();
		let arrayY = [minY, maxY].sort();
		let tiles = [];
		for (var x = arrayX[0]; x <= arrayX[1]; x++) {
			for (var y = arrayY[0]; y <= arrayY[1]; y++) {
				tiles.push({ X: x, Y: y, zoom: zoom });
			}
		}

		// We want at least minNumberOfTiles tiles per pointcloud node
		if (tiles.length >= minNumberOfTiles || zoom === maxZoom) {
			return tiles;
		} else {
			return this.getTiles(minCoord, maxCoord, zoom+1);
		}
	}

	tilePromisesFor(Tiles) {
		return Tiles.map(function (tile, i) {
			return new Promise((resolve, reject) => {
				let image = new Image(256, 256);
				image.crossOrigin = "Anonymous";
				image.onload = function () {
					resolve({ tile: tile, image: image });
				}
				image.src = "https://tile.openstreetmap.org" + "/" + tile.zoom + "/" + tile.X + "/" + tile.Y + ".png";
			})
		});

	}


	drawTileOnCanvas(canvas, image, tile, minCoord, maxCoord) {
		let Y_values = [this.lat2tileDouble(minCoord[1], tile.zoom), this.lat2tileDouble(maxCoord[1], tile.zoom)];
		let Y_min = Math.min(...Y_values);
		let X_values = [this.long2tileDouble(minCoord[0], tile.zoom), this.long2tileDouble(maxCoord[0], tile.zoom)]
		let X_min = Math.min(...X_values);
		let Y_max = Math.max(...Y_values);
		let X_max = Math.max(...X_values);

		let isTop = Y_min >= tile.Y;
		let isBottom = Y_max <= tile.Y + 1;
		let isLeft = X_min >= tile.X;
		let isRight = X_max <= tile.X + 1;

		if (isTop && !isBottom) {
			var sY = image.height * (Y_min - tile.Y);
			var dY = 0;
			var imageHeightToBeDrawn = image.height - sY;
			var drawingHeight = imageHeightToBeDrawn * (1 / (Y_max - Y_min));

		} else if (isBottom && !isTop) {
			var sY = 0;
			var dY = canvas.height * (tile.Y - Y_min) / (Y_max - Y_min);
			var sY_bottom = image.height * (1 - (Y_max - tile.Y));
			var imageHeightToBeDrawn = image.height - sY_bottom;
			var drawingHeight = imageHeightToBeDrawn * (1 / (Y_max - Y_min));

		} else if (!isTop && !isBottom) {
			var sY = 0;
			var imageHeightToBeDrawn = image.height;
			var dY = canvas.height * (tile.Y - Y_min) / (Y_max - Y_min);
			var drawingHeight = canvas.height / (Y_max - Y_min);

		} else if (isBottom && isTop) {
			var sY_bottom = image.height * (tile.Y + 1 - Y_max);
			var sY = image.height * (Y_min - tile.Y);
			var imageHeightToBeDrawn = image.height - (sY + sY_bottom);
			var dY = 0;
			var drawingHeight = canvas.height;
		}

		if (isLeft && !isRight) {
			var dX = 0;
			var sX = image.width * (X_min - tile.X);
			var imageWidthToBeDrawn = image.width - sX;
			var drawingWidth = imageWidthToBeDrawn * (canvas.width / image.width) * (1 / (X_max - X_min));
		} else if (isRight && !isLeft) {
			var dX = canvas.width * (tile.X - X_min) / (X_max - X_min);
			var sX = 0;
			var sX_Right = image.width * (1 - (X_max - tile.X));
			var imageWidthToBeDrawn = image.width - sX_Right;
			var drawingWidth = imageWidthToBeDrawn * (canvas.width / image.width) * (1 / (X_max - X_min));

		} else if (!isRight && !isLeft) {
			var sX = 0;
			var imageWidthToBeDrawn = image.width;
			var dX = canvas.width * (tile.X - X_min) / (X_max - X_min);
			var drawingWidth = canvas.width / (X_max - X_min);
		} else if (isLeft && isRight) {
			var sX = image.width * (X_min - tile.X);
			var sX_Right = image.width * (tile.X + 1 - X_max);
			var imageWidthToBeDrawn = image.width - (sX + sX_Right);
			var dX = 0;
			var drawingWidth = canvas.width;
		}

		let ctx = canvas.getContext("2d");
		ctx.drawImage(image, sX, sY, imageWidthToBeDrawn, imageHeightToBeDrawn, dX, dY, drawingWidth, drawingHeight);
		ctx.strokeStyle = "black";
		ctx.strokeRect(dX, dY, drawingWidth, drawingHeight);
	}

};
