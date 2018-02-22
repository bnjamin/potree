(function() {
	window.viewer = new Potree.Viewer(document.getElementById("potree_render_area"));
		
	viewer.setEDLEnabled(true);
	viewer.setFOV(60);
	viewer.setPointBudget(1*1000*1000);
	viewer.loadSettingsFromURL();

	viewer.setDescription("Point cloud courtesy of <a target='_blank' href='https://www.sigeom.ch/'>sigeom sa</a>");
	getTexture().then(texture => {
		// Load and add point cloud to scene
		Potree.loadPointCloud("../../pointclouds/vol_total/cloud.js", "sigeom.sa", e => {
			let scene = viewer.scene;
			let pointcloud = e.pointcloud;
			
			let material = pointcloud.material;
			material.size = 1;
			material.pointSizeType = Potree.PointSizeType.ADAPTIVE;
			material.pointColorType = Potree.PointColorType.MAP;
			material.shape = Potree.PointShape.SQUARE;
			material.texture = texture;

			material.updateShaderSource();

			window.loadedTexture = material.texture;

			pointcloud.updateMatrixWorld();
			
			scene.addPointCloud(pointcloud);
			viewer.fitToScreen();
		});

	});

	

	function getTexture() {
		return new Promise((resolve, reject) => {
			let image = new Image(256, 256);
			image.onload = function() {
				let canvasEl = document.getElementById("texture");
				canvasEl.width = 256;
				canvasEl.height = 256;
				let ctx = canvasEl.getContext("2d");
				ctx.drawImage(this, 0, 0);
				let texture = new THREE.CanvasTexture(canvasEl);
				texture.minFilter = THREE.LinearFilter;
				texture.needsUpdate = true;

				return resolve(texture);
			}
			image.src = "./thumbnails/santorini.jpg"

		});
	}
})();