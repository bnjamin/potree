(function() {
	window.viewer = new Potree.Viewer(document.getElementById("potree_render_area"));
		
	viewer.setEDLEnabled(true);
	viewer.setFOV(60);
	viewer.setPointBudget(1*1000*1000);
	viewer.loadSettingsFromURL();

	viewer.setDescription("Point cloud courtesy of <a target='_blank' href='https://www.sigeom.ch/'>sigeom sa</a>");

	let canvasEl = document.getElementById("texture");
	let ctx = canvasEl.getContext("2d");
	ctx.beginPath();
	ctx.rect(0, 0, canvasEl.width, canvasEl.height);
	ctx.fillStyle = "red";
	ctx.fill();

	// Load and add point cloud to scene
	Potree.loadPointCloud("../../pointclouds/vol_total/cloud.js", "sigeom.sa", e => {
		let scene = viewer.scene;
		let pointcloud = e.pointcloud;
		
		let material = pointcloud.material;
		material.size = 1;
		material.pointSizeType = Potree.PointSizeType.ADAPTIVE;
		material.pointColorType = Potree.PointColorType.MAP;
		material.shape = Potree.PointShape.SQUARE;
		material.texture = new THREE.CanvasTexture(canvasEl);
		material.texture.minFilter = THREE.LinearFilter;
		texture.needsUpdate = true;

		material.updateShaderSource();

		window.loadedTexture = material.texture;

		pointcloud.updateMatrixWorld();
		
		scene.addPointCloud(pointcloud);
		viewer.fitToScreen();
	});
})();