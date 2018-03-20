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
	constructor(projection, bbMin, bbMax) {
		this.projection = projection;
		this.bbMin = bbMin;
		this.bbMax = bbMax;
		this._textureAtlas = new Potree.TileTextureAtlas(256, 256);
		this._mapCanvas = document.getElementById("texture");
		let ratio = (bbMax[0] - bbMin[0]) / (bbMax[1] - bbMin[1]);
		let textureHeight = screen.height;
		let textureWidth = screen.width;
		let minHeight = 256;
		this._mapCanvas.width = minHeight * ratio;
		this._mapCanvas.height = minHeight;
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
		this._cachedTexture = null;
		this.geometryNodeIds = new Set();
		this._cachedTileImages = [];
		this._currentMaxZoom = this.getTiles(this._minWeb, this._maxWeb)[0].zoom;
	}

	getImageCoordinates(boundingBox, matrixWorld) {
		var swiss = proj4.defs("test");
		var WGS84 = proj4.defs("WGS84");
		let nodeBox = Potree.utils.computeTransformedBoundingBox(boundingBox, matrixWorld);
		let minWeb = proj4(swiss, WGS84, [nodeBox.min.x, nodeBox.min.y]);
		let minX = this.long2tileDouble(minWeb[0], zoom);
		let minY = this.lat2tileDouble(minWeb[1], zoom);


	}

	updateTextureFor(visibleNodes, matrixWorld) {
		if (visibleNodes.length > 0) {
			let maxLevel = Math.max(...visibleNodes.map(e => e.geometryNode.level));
			let leafNodes = visibleNodes.filter(e => e.geometryNode.level === maxLevel);
			let boundingBox = {
				min: {
					x: Math.min(...leafNodes.map(e => e.geometryNode.boundingBox.min.x)),
					y: Math.min(...leafNodes.map(e => e.geometryNode.boundingBox.min.y)),
					z: Math.min(...leafNodes.map(e => e.geometryNode.boundingBox.min.z))
				},
				max: {
					x: Math.max(...leafNodes.map(e => e.geometryNode.boundingBox.max.x)),
					y: Math.max(...leafNodes.map(e => e.geometryNode.boundingBox.max.y)),
					z: Math.max(...leafNodes.map(e => e.geometryNode.boundingBox.min.z))
				}
			};
			var swiss = proj4.defs("test");
			var WGS84 = proj4.defs("WGS84");
			let nodeBox = Potree.utils.computeTransformedBoundingBox(boundingBox, matrixWorld);
			let minWeb = proj4(swiss, WGS84, [nodeBox.min.x, nodeBox.min.y]);
			let maxWeb = proj4(swiss, WGS84, [nodeBox.max.x, nodeBox.max.y]);
			this._maxWeb = maxWeb;
			this._minWeb = minWeb;
			this.updateTexture(minWeb, maxWeb);
		}
	}

	updateTexture(minWeb, maxWeb) {
		let canvasEl = this._mapCanvas;
		let tiles = this.getTiles(minWeb, maxWeb);
		let tilesToFecth = [];
		tiles.forEach(tile => {
			let imageTile = this._textureAtlas.getImageBasedOnTile(tile);
			if (imageTile !== undefined) {
				tile.Image = imageTile;
			} else {
				tilesToFecth.push(tile);
			}
		});
		if (tilesToFecth.length > 0) {
			let tilePromises = this.tilePromisesFor(tilesToFecth);
			tilePromises.forEach(tilePromise => {
				tilePromise.then(tileImage => {
					this._textureAtlas.insert(tileImage);
					if (this._cachedTexture) {
						this._cachedTexture.dispose();
						this._cachedTexture = null;
					}
				});
			});
		}
	}

	get mapTexture() {
		if (this._cachedTexture) {
			return this._cachedTexture;
		}
		let texture = new THREE.CanvasTexture(this._mapCanvas);
		texture.minFilter = THREE.LinearFilter;
		texture.needsUpdate = true;
		this._cachedTexture = texture;
		return texture;
	}

	long2tile(lon, zoom) { return (Math.floor((lon + 180) / 360 * Math.pow(2, zoom))); }
	lat2tile(lat, zoom) { return (Math.floor((1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * Math.pow(2, zoom))); }

	long2tileDouble(lon, zoom) { return (((lon + 180) / 360 * Math.pow(2, zoom))); }
	lat2tileDouble(lat, zoom) { return (((1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * Math.pow(2, zoom))); }

	getTiles(minCoord, maxCoord, zoom = 18) {
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
			return tiles;
		} else {
			return this.getTiles(minCoord, maxCoord, zoom - 1);
		}
	}

	tilePromisesFor(Tiles) {
		return Tiles.map(function (tile, i) {
			return new Promise((resolve, reject) => {
				fetch("https://tile.openstreetmap.org" + "/" + tile.zoom + "/" + tile.X + "/" + tile.Y + ".png",
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

				// let image = new Image(256, 256);
				// image.crossOrigin = "Anonymous";
				// image.onload = function () {
				// 	let data = { tile: tile, image: image };
				// 	resolve(data);
				// }
				// image.src = "https://tile.openstreetmap.org" + "/" + tile.zoom + "/" + tile.X + "/" + tile.Y + ".png";
			})
		});
	}


	drawTileOnCanvas(canvas, image, tile) {
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

	resizeCanvasTo(zoom) {
		let canvas = this._mapCanvas;
		let multiplier = Math.pow(2, zoom - this._currentMaxZoom);

		// create a temporary canvas obj to cache the pixel data //
		var temp_cnvs = document.createElement('canvas');
		// set it to the new width & height and draw the current canvas data into it // 
		temp_cnvs.width = canvas.width * multiplier;
		temp_cnvs.height = canvas.height * multiplier;
		var temp_cntx = temp_cnvs.getContext('2d');

		temp_cntx.drawImage(canvas, 0, 0);

		// resize & clear the original canvas and copy back in the cached pixel data //
		canvas.width = canvas.width * multiplier;
		canvas.height = canvas.height * multiplier;
		let ctx = canvas.getContext("2d");
		ctx.scale(multiplier, multiplier);
		ctx.drawImage(temp_cnvs, 0, 0);
		this._currentMaxZoom = zoom;
		temp_cnvs = null;
		temp_cntx = null;

		console.log(canvas.width, canvas.height)
	}

};
