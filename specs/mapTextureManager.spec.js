let chai = require("chai");
// Tell chai that we'll be using the "should" style assertions.
chai.should();
if (typeof Potree === "undefined") {
	Potree = {};
}

let MapTextureManager = require('../src/MapTextureManager');


describe('MapTextureManager', function () {
	let mapTextureManager;
	let tileAtlas;
	let mapTileConverter;
	beforeEach(() => {
		let projection = "Irrelevant";
		let matrixWorld = "Irrelevant";
		sinon.mock(mapTileConverter);
		sinon.mock(tileAtlas);
		mapTextureManager = new Potree.MapTextureManager(matrixWorld, mapTileConverter, tileAtlas);
	});

	
})
