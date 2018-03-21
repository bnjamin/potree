Potree.MapTextureManagerSettings = {
	tileServer: null
};

// public method for encoding an Uint8Array to base64
function encode(input) {
	var keyStr = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
	var output = "";
	var chr1, chr2, chr3, enc1, enc2, enc3, enc4;
	var i = 0;

	while (i < input.length) {
		chr1 = input[i++];
		chr2 = i < input.length ? input[i++] : Number.NaN; // Not sure if the index 
		chr3 = i < input.length ? input[i++] : Number.NaN; // checks are needed here

		enc1 = chr1 >> 2;
		enc2 = ((chr1 & 3) << 4) | (chr2 >> 4);
		enc3 = ((chr2 & 15) << 2) | (chr3 >> 6);
		enc4 = chr3 & 63;

		if (isNaN(chr2)) {
			enc3 = enc4 = 64;
		} else if (isNaN(chr3)) {
			enc4 = 64;
		}
		output += keyStr.charAt(enc1) + keyStr.charAt(enc2) +
			keyStr.charAt(enc3) + keyStr.charAt(enc4);
	}
	return output;
}

Potree.MapTextureManager = class MapTextureManager {
	constructor(projection, matrixWorld) {
		this.projection = projection;
		this._textureAtlas = new Potree.TileTextureAtlas(256, 256);
		proj4.defs('test', this.projection);
		this._inputCoordinateSystem = proj4.defs("test");
		this._WGS84 = proj4.defs("WGS84");
		this._matrixWorld = matrixWorld;
	}

	getTileDataFor(geometryNode) {
		let nodeBox = Potree.utils.computeTransformedBoundingBox(geometryNode.boundingBox, this._matrixWorld);
		let minWeb = proj4(this._inputCoordinateSystem, this._WGS84, [nodeBox.min.x, nodeBox.min.y]);
		let maxWeb = proj4(this._inputCoordinateSystem, this._WGS84, [nodeBox.max.x, nodeBox.max.y]);
		let wantedZoomLevel = this.getZoomLevel(minWeb, maxWeb);
		let yValues = [
			this.lat2tileDouble(minWeb[1], wantedZoomLevel),
			this.lat2tileDouble(maxWeb[1], wantedZoomLevel)
		];
		let xValues = [
			this.long2tileDouble(minWeb[0], wantedZoomLevel),
			this.long2tileDouble(maxWeb[0], wantedZoomLevel)
		];
		let minY = Math.min(...yValues);
		let minX = Math.min(...xValues);
		let maxY = Math.max(...yValues);
		let maxX = Math.max(...xValues);

		return this._textureAtlas.getTileDataFor(minX, minY, maxX, maxY, wantedZoomLevel);
	}

	updateTextureFor(visibleNodes, callback) {
		let promises = [];
		visibleNodes.forEach(node => {
			let nodeBox = Potree.utils.computeTransformedBoundingBox(node.geometryNode.boundingBox, this._matrixWorld);
			let minCoord = proj4(this._inputCoordinateSystem, this._WGS84, [nodeBox.min.x, nodeBox.min.y]);
			let maxCoord = proj4(this._inputCoordinateSystem, this._WGS84, [nodeBox.max.x, nodeBox.max.y]);
			let tile = this.getTile(minCoord, maxCoord);
			let hasTile = this._textureAtlas.hasTile(tile);
			if (!hasTile) {
				promises.push(this.tilePromiseFor(tile));
			}
		});
		promises.forEach(promise => {
			promise.then(tileImage => {
				this._textureAtlas.insert(tileImage);
			});
		});
		if (promises.length === 0) {
			return;
		}
		Promise.all(promises).then(() => {
			callback(this._textureAtlas.texture)
		});
	}

	long2tile(lon, zoom) { return (Math.floor((lon + 180) / 360 * Math.pow(2, zoom))); }
	lat2tile(lat, zoom) { return (Math.floor((1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * Math.pow(2, zoom))); }

	long2tileDouble(lon, zoom) { return (((lon + 180) / 360 * Math.pow(2, zoom))); }
	lat2tileDouble(lat, zoom) { return (((1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * Math.pow(2, zoom))); }

	getTile(minCoord, maxCoord, zoom = 18) {
		let minZoom = 1;
		let minNumberOfTiles = 1;
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
		if (tiles.length === minNumberOfTiles || zoom === minZoom) {
			return tiles[0];
		} else {
			return this.getTile(minCoord, maxCoord, zoom - 1);
		}
	}

	// Finds a zoom level where minWeb and maxWeb is inside the same tile
	getZoomLevel(minWeb, maxWeb) {
		let currentZoomLevel = 18;

		while(true) {
			let minLong = this.long2tile(minWeb[0], currentZoomLevel);
			let maxLong = this.long2tile(maxWeb[0], currentZoomLevel);
			let minLat =  this.lat2tile(minWeb[1], currentZoomLevel);
			let maxLat =  this.lat2tile(maxWeb[1], currentZoomLevel);

			if (minLong === maxLong && minLat === maxLat) {
				return currentZoomLevel;
			} else {
				currentZoomLevel--;
			}
		}
	}

	tilePromiseFor(tile) {
		return new Promise((resolve, reject) => {
			fetch(Potree.MapTextureManagerSettings.tileServer + tile.zoom + "/" + tile.X + "/" + tile.Y + ".png",
				{ mode: 'cors', cache: true })
				.then(response =>
					response.arrayBuffer()
				).then(buffer => {
					let image = new Image(256, 256);
					let bytes = new Uint8Array(buffer);
					image.src = "data:image/png;base64," + encode(bytes);
					let data = { tile: tile, image: image }
					resolve(data);
				});
		});
	}


	drawTileOnCanvas(canvas, image, tile, minWeb, maxWeb) {
		let Y_values = [this.lat2tileDouble(this._minWeb[1], tile.zoom), this.lat2tileDouble(this._maxWeb[1], tile.zoom)];
		let Y_min = Math.min(...Y_values);
		let X_values = [this.long2tileDouble(this._minWeb[0], tile.zoom), this.long2tileDouble(this._maxWeb[0], tile.zoom)]
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
			var drawingHeight = imageHeightToBeDrawn * (canvas.height / image.height) * (1 / (Y_max - Y_min));

		} else if (isBottom && !isTop) {
			var sY = 0;
			var dY = canvas.height * (tile.Y - Y_min) / (Y_max - Y_min);
			var sY_bottom = image.height * (1 - (Y_max - tile.Y));
			var imageHeightToBeDrawn = image.height - sY_bottom;
			var drawingHeight = imageHeightToBeDrawn * (canvas.height / image.height) * (1 / (Y_max - Y_min));
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
		// ctx.strokeStyle = "black";
		// ctx.strokeRect(dX, dY, drawingWidth, drawingHeight);
		image.src = "";
		image = null;
	}


};
