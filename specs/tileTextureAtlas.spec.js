let chai = require("chai");
// Tell chai that we'll be using the "should" style assertions.
let MockBrowser = require('mock-browser').mocks.MockBrowser;
Potree = {};
let sinon = require("sinon");
let sinonChai = require("sinon-chai");
chai.use(sinonChai);
chai.should();

require('../src/TileTextureAtlas');


describe('TileTextureAtlas', function () {
	let tileTextureAtlas;
	let document;
	let fakeContext;
	let tileImage = {
		image: {
			width: 256,
			height: 256
		},
		tile: {
			X: 10,
			Y: 10
		}
	};
	beforeEach(() => {
		document = MockBrowser.createDocument();
		let imageHeight = 1;
		let imageWidth = 1;
		//From https://stackoverflow.com/questions/30454025/mock-document-getelemetbyid-form-getcontext2d-using-sinon?utm_medium=organic&utm_source=google_rich_qa&utm_campaign=google_rich_qa
		//Create your fake canvas and context objects
		fakeContext = {
			drawImage: function () { }
		}; //Replace this with whatever you want your fake context to be
		let canvas = document.createElement('canvas');

		//Have `canvas.getContext('2d')` return your fake context
		sinon.stub(canvas, 'getContext');
		canvas.getContext.withArgs('2d').returns(fakeContext);
		fakeContext = sinon.stub(fakeContext);
		//Have `document.getElementById('canvas')` return your canvas
		sinon.stub(document, 'getElementById');
		document.getElementById.withArgs('texture').returns(canvas);

		tileTextureAtlas = new Potree.TileTextureAtlas(imageHeight, imageWidth, document);
	});

	after(function () {
		document.getElementById.restore(); // Unwraps the spy
	});

	describe('hasTile', function () {

	})

	describe('_usedTiles', function () {

		it('should return 0 tiles when nothing is inserted', () => {
			let tiles = tileTextureAtlas._usedTiles();
			tiles.should.have.length(0);
		});

		it('should return 2 tiles when two tile is inserted', () => {
			tileTextureAtlas.insert(tileImage);
			tileTextureAtlas.insert(tileImage);

			let tiles = tileTextureAtlas._usedTiles();
			tiles.should.have.length(2);
		});
	})

	describe('getTileDataFor', () => {
		it('should return 2 tiles when two tile is inserted', () => {
			tileTextureAtlas.insert(tileImage);
			tileTextureAtlas.insert(tileImage);
			let node 
			tileTextureAtlas.getTileDataFor()

		});
	})

	describe('removeOldestTile', () => {
		it('should remove first inserted tile (index 0)', () => {
			tileTextureAtlas.insert(tileImage);
			let index = tileTextureAtlas.removeOldestTile();
			index.should.equal(0);
		});
	})

	describe('findNextIndex', function () {
		it('should return index 0 when nothing is inserted', () => {
			let index = tileTextureAtlas.findNextIndex();
			index.should.equal(0);
		});

		it('should return index 2 when two tile is inserted', () => {
			tileTextureAtlas.insert(tileImage);
			tileTextureAtlas.insert(tileImage);
			let index = tileTextureAtlas.findNextIndex();
			index.should.equal(2);
			fakeContext.drawImage.should.have.been.calledTwice;
		});

	})




})