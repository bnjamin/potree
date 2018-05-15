let chai = require("chai");
chai.should();
Potree = {};

require("../src/TileTextureAtlas");

describe("Tile", () => {
	let index = 0;
	let x = 5;
	let y = 6;
	let zoom = 5;
	let tile = new Potree.Tile(index, x, y, zoom);
	let convertValueToZoom = (value, oldZoom, newZoom) => {
		return value * Math.pow(2, newZoom - oldZoom);
	}

	describe('minX', () => {
		it('returns the given x if no argument is given', () => {
			tile.minX().should.equal(x);
		});
		it('returns the minX for the provided zoom level', () => {
			let newZoom = 3;
			let expectedMinX = convertValueToZoom(x, zoom, newZoom);
			tile.minX(newZoom).should.equal(expectedMinX);
		});
	});

	describe('maxX', () => {
		it('returns the given x + 1 if no argument is given', () => {
			tile.maxX().should.equal(x+1);
		});
		it('returns the maxX for the provided zoom level', () => {
			let newZoom = 3;
			let expectedMaxX = convertValueToZoom(x+1, zoom, newZoom);
			tile.maxX(newZoom).should.equal(expectedMaxX);
		});
	});

	describe('minY', () => {
		it('returns the given y if no argument is given', () => {
			tile.minY().should.equal(y);
		});
		it('returns the minY for the provided zoom level', () => {
			let newZoom = 3;
			let expectedMinY = convertValueToZoom(y, zoom, newZoom);
			tile.minY(newZoom).should.equal(expectedMinY);
		});
	});

	describe('maxY', () => {
		it('returns the given y + 1 if no argument is given', () => {
			tile.maxY().should.equal(y+1);
		});
		it('returns the maxY for the provided zoom level', () => {
			let newZoom = 3;
			let expectedMaxY = convertValueToZoom(y+1, zoom, newZoom);
			tile.maxY(newZoom).should.equal(expectedMaxY);
		});
	});

	describe('overlapsNode', () => {
		it('returns false if the tile is to the left of the node', () => {
			let node = {
				minX: tile.minX() + 3,
				maxX: tile.maxX() + 3,
				minY: tile.minY(),
				maxY: tile.maxY(),
				zoom: tile.zoom
			};
			tile.overlapsNode(node).should.equal(false);
		}); 
		it('returns false if the tile is to the right of the node', () => {
			let node = {
				minX: tile.minX() - 3,
				maxX: tile.maxX() - 3,
				minY: tile.minY(),
				maxY: tile.maxY(),
				zoom: tile.zoom
			};
			tile.overlapsNode(node).should.equal(false);
		});
		it('returns false if the tile is to the top of the node', () => {
			let node = {
				minX: tile.minX(),
				maxX: tile.maxX(),
				minY: tile.minY() + 3,
				maxY: tile.maxY() + 3,
				zoom: tile.zoom
			};
			tile.overlapsNode(node).should.equal(false);
		});
		it('returns false if the tile is to the bottom of the node', () => {
			let node = {
				minX: tile.minX(),
				maxX: tile.maxX(),
				minY: tile.minY() - 3,
				maxY: tile.maxY() - 3,
				zoom: tile.zoom
			};
			tile.overlapsNode(node).should.equal(false);
		});

		it('returns true if the tile overlaps the node', () => {
			let node = {
				minX: tile.minX(),
				maxX: tile.maxX(),
				minY: tile.minY(),
				maxY: tile.maxY(),
				zoom: tile.zoom
			};
			tile.overlapsNode(node).should.equal(true);
		});
	});

	describe('minUFor(node)', () => {
		it('returns 0 if the tiles minX is <= the nodes minX', () => {
			let node = {
				zoom: tile.zoom,
				minX: tile.minX() + 1,
				maxX: tile.maxX() + 1
			};

			tile.minUFor(node).should.equal(0);
		});
		it('returns 0.5 if the tiles minX is in the middle of the nodes x-values', () => {
			let node = {
				zoom: tile.zoom,
				minX: tile.minX() - 0.5,
				maxX: tile.minX() + 0.5
			};

			tile.minUFor(node).should.equal(0.5);
		});
	});

	describe('maxUFor(node)', () => {
		it('returns 1 if the tiles maxX is >= the nodes maxX', () => {
			let node = {
				zoom: tile.zoom,
				minX: tile.minX() - 1,
				maxX: tile.maxX() - 1
			};

			tile.maxUFor(node).should.equal(1);
		});
		it('returns 0.5 if the tiles maxX is in the middle of the nodes x-values', () => {
			let node = {
				zoom: tile.zoom,
				minX: tile.maxX() - 0.5,
				maxX: tile.maxX() + 0.5
			};

			tile.maxUFor(node).should.equal(0.5);
		});
	});


	describe('minVFor(node)', () => {
		it('returns 0 if the tiles maxY is >= the nodes minY', () => {
			let node = {
				zoom: tile.zoom,
				minY: tile.minY() - 1,
				maxY: tile.maxY() - 1
			};

			tile.minVFor(node).should.equal(0);
		});
		it('returns 0.5 if the tiles maxY is in the middle of the nodes y-values', () => {
			let node = {
				zoom: tile.zoom,
				minY: tile.maxY() - 0.5,
				maxY: tile.maxY() + 0.5
			};

			tile.minVFor(node).should.equal(0.5);
		});
	});

	describe('maxVFor(node)', () => {
		it('returns 1 if the tiles minY is <= the nodes maxY', () => {
			let node = {
				zoom: tile.zoom,
				minY: tile.minY() + 1,
				maxY: tile.maxY() + 1
			};

			tile.maxVFor(node).should.equal(1);
		});
		it('returns 0.5 if the tiles minY is in the middle of the nodes y-values', () => {
			let node = {
				zoom: tile.zoom,
				minY: tile.minY() - 0.5,
				maxY: tile.minY() + 0.5
			};

			tile.maxVFor(node).should.equal(0.5);
		});
	});

	describe('xOffset(x, node)', () => {
		it('returns x if the node is has the samme minX as the tile', () => {
			let node = {
				minX: tile.minX(),
				maxX: tile.maxX(),
				zoom: tile.zoom
			};
			let expectedX = 3;

			tile.xOffset(expectedX, node).should.equal(expectedX);
		});

		it('returns x + 0.5 if the nodes minX is in the middle of the tiles x-values', () => {
			let node = {
				minX: (tile.minX() + tile.maxX()) / 2,
				maxX: tile.maxX(),
				zoom: tile.zoom
			};
			let expectedX = 3;
			let offset = 0.5;

			tile.xOffset(expectedX, node).should.equal(expectedX + offset);
		});
	});

	describe('yOffset(y, node)', () => {
		it('returns y + 1 if the nodes maxY is the same as the tiles minY', () => {
			let node = {
				minY: tile.minY() - 1,
				maxY: tile.minY(),
				zoom: tile.zoom
			};
			let yValue = 3;
			let expectedY = yValue + 1;

			tile.yOffset(yValue, node).should.equal(expectedY);
		});

		it('returns y + 0.5 if the nodes maxY is in the middle of the tiles y-values', () => {
			let node = {
				minY: tile.minY() - 1,
				maxY: (tile.minY() + tile.maxY()) / 2,
				zoom: tile.zoom
			};
			let yValue = 3;
			let expectedY = yValue + 0.5;

			tile.yOffset(yValue, node).should.equal(expectedY);
		});
	});

	describe('nodeWidth(node)', () => {
		it('return 1 if the node has the same width as the tile', () => {
			let node = {
				minX: tile.minX(),
				maxX: tile.maxX(),
				zoom: tile.zoom
			};

			tile.nodeWidth(node).should.equal(1);
		});

		it('returns 0.5 if the node is half the width of the tile', () => {
			let node = {
				minX: tile.minX(),
				maxX: tile.minX() + (tile.maxX() - tile.minX()) / 2,
				zoom: tile.zoom
			};

			tile.nodeWidth(node).should.equal(0.5);
		});
	});

	describe('nodeHeight(node)', () => {
		it('return 1 if the node has the same height as the tile', () => {
			let node = {
				minY: tile.minY(),
				maxY: tile.maxY(),
				zoom: tile.zoom
			};

			tile.nodeHeight(node).should.equal(1);
		});

		it('returns 0.5 if the node is half the height of the tile', () => {
			let node = {
				minY: tile.minY(),
				maxY: tile.minY() + (tile.maxY() - tile.minY()) / 2,
				zoom: tile.zoom
			};

			tile.nodeHeight(node).should.equal(0.5);
		});
	});
});
