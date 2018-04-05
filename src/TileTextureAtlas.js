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

	get texture() {
		let texture = new THREE.CanvasTexture(this._canvas);
		texture.minFilter = THREE.LinearFilter;
		texture.needsUpdate = true;
		return texture;
	}

	getTileDataFor(minX, minY, maxX, maxY, forZoomLevel) {
		let tile = this._tiles.find(tile => {
			return tile &&
				tile.X === Math.floor(minX) &&
				tile.Y === Math.floor(minY) &&
				tile.zoom === forZoomLevel;
		});

		if (tile) {
			tile.stamp = new Date();
			return {
				numberOfTilesWidth: this._numberOfTilesWidth,
				numberOfTilesHeight: this._numberOfTilesHeight,
				x: tile.index % this._numberOfTilesWidth,
				y: this._numberOfTilesHeight - 1 - Math.floor(tile.index / this._numberOfTilesWidth),
				xOffset: minX - Math.floor(minX),
				yOffset: ((Math.floor(maxY) + 1) - maxY),
				width: maxX - minX,
				height: maxY - minY
			}
		}
	}

	hasTile(tile) {
		let foundTile = this._tiles.find(_tile => {
			return _tile &&_tile.zoom === tile.zoom &&
				_tile.X === tile.X && _tile.Y === tile.Y;

		});
		if (foundTile) {
			foundTile.stamp = new Date();
			return true;
		} else {
			return false;
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
		let oldestDate = Math.min(...this._tiles.map(d => d.stamp));
		let tile = this._tiles.find(o => o.stamp.getTime() === oldestDate)
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
		let image = tileImage.image;
		let tile = Object.assign({
			index: index,
			stamp: new Date()
		}, tileImage.tile);
		this._tiles[index] = tile;
		let ctx = this._canvas.getContext("2d");
		let xOffset = (index % this._numberOfTilesWidth) * image.width;
		let yOffset = Math.floor(index / this._numberOfTilesWidth) * image.height;

		ctx.drawImage(image, xOffset, yOffset);
	}
}
