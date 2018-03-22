

Potree.TileTextureAtlas = class TileTextureAtlas {
	constructor(tileHeight, tileWidth) {
		this._canvas = document.getElementById("texture");
		this._numberOfTilesHeight = Math.pow(2, 2);
		this._numberOfTilesWidth = Math.pow(2, 5);
		this._canvas.height = tileHeight * this._numberOfTilesHeight;
		this._canvas.width = tileWidth * this._numberOfTilesWidth;
		this._tiles = Array(this._numberOfTilesHeight * this._numberOfTilesWidth);
	}

	getNumberOfTilesInAtlas() {
		return this._tiles.length();
	}

	getImages(X_min, Y_min, X_max, Y_max, zoomLevel) {
		return this._tiles.filter(e => e.zoomLevel === zoomLevel && (e.X === X_max || e.X === X_min && e.Y === Y_max || e.Y === Y_min));
	}

	getImageBasedOnTile(tile) {
		let image = this._tiles.filter(e => e.tile.zoomLevel === tile.zoomLevel && e.tile.X === tile.X && e.tile.Y === tile.Y)[0];
		if (image) {
			let index = this._tiles.indexOf(image);
			this._tiles[index].Stamp = new Date();
			return image
		} else {
			return undefined;
		}
	}

	get texture() {
		let texture = new THREE.CanvasTexture(this._canvas);
		texture.minFilter = THREE.LinearFilter;
		texture.needsUpdate = true;
		return texture;
	}

	getTileDataFor(minX, minY, maxX, maxY, wantedZoomLevel) {
		let tileIndex = this._tiles.findIndex(tile => {
			return tile &&
			tile.tile.X === Math.floor(minX) &&
			tile.tile.Y === Math.floor(minY) &&
			tile.tile.zoom === wantedZoomLevel;
		});

		if (tileIndex !== -1) {
			this._tiles[tileIndex].Stamp = new Date();
			return {
				numberOfTilesWidth: this._numberOfTilesWidth,
				numberOfTilesHeight: this._numberOfTilesHeight,
				x: tileIndex % this._numberOfTilesWidth,
				y: this._numberOfTilesHeight - 1 - Math.floor(tileIndex / this._numberOfTilesWidth),
				xOffset: minX - Math.floor(minX),
				yOffset: ((Math.floor(maxY) + 1) - maxY),
				width: maxX - minX,
				height: maxY - minY
			}
		}
	}

	hasTile(tile) {
		let imageTile = this._tiles.filter(e => e.tile.zoomLevel === tile.zoomLevel && e.tile.X === tile.X && e.tile.Y === tile.Y)[0];
		if (imageTile) {
			let index = this._tiles.indexOf(imageTile);
			this._tiles[index].Stamp = new Date();
			return true;
		} else {
			return false;
		}
	}

	removeImage(X, Y, zoomLevel) {
		if (this._tiles.length() > 0) {
			let index = this._tiles.findIndex()(o => o.tile.X === X && o.tile.Y === Y && o.tile.zoomLevel === zoomLevel);
			if (index !== -1) {
				this._tiles[index] = undefined;
			}
		} else {
			return;
		}
	}

	removeIndex(index) {
		if (this._tiles.length > 0 && index !== -1) {
			this._tiles[index] = undefined;
		} else {
			return;
		}
	}

	removeOldestTile() {
		let oldestDate = Math.min(...this._tiles.map(d => d.Stamp));
		let tile = this._tiles.find(o => o.Stamp.getTime() === oldestDate)
		let index = this._tiles.indexOf(tile);
		this.removeIndex(index);
		return index;
	}

	findNextIndex() {
		if (this._tiles.length > 0) {
			for (var i = 0; i < this._tiles.length; i++) {
				if (this._tiles[i] === undefined) {
					return i;
				}
			}
			//Empty slot not found has to make space in the tile array
			let index = this.removeOldestTile();
			return index;
		} else {
			return 0;
		}
	}

	insert(tileImage) {
		let index = this.findNextIndex();
		tileImage.Stamp = new Date();
		this._tiles[index] = tileImage;
		let ctx = this._canvas.getContext("2d");
		let xOffset = (index % this._numberOfTilesWidth) * tileImage.image.width;
		let yOffset = Math.floor(index / this._numberOfTilesWidth) * tileImage.image.height;

		ctx.drawImage(tileImage.image, xOffset, yOffset);
	}




}
