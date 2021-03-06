var FlameShootStrategy = ShootStrategy.extend({
	init: function(spriteFactory, materialFactory) {
		this.spriteFactory = spriteFactory;
		this.materialFactory = materialFactory;

		this.weaponClipSize = 4;
		this.weaponReloadRate = 0.6;
	}, 

	shoot: function(owner, from, to) {
		var bulletColor = 0xED4A1C;
		var material = this.materialFactory.createTransparentGlowMaterial(this.spriteFactory.world.camera.position);
		material.uniforms['glowColor'].value = new THREE.Color(bulletColor);
		material.uniforms['p'].value = 1;
		material.uniforms['c'].value = 0.4;

		var radius = 12;
		var geometry = new THREE.SphereGeometry(radius, 15, 15);
		var mesh = new THREE.Mesh(geometry, material);

		var light = new THREE.PointLight(0xED4A1C, 4.0, 80);

		var bulletArgs = {
			radius: radius,
			mesh: mesh,
			addons: [light],
			damage: 20, 
			speed: 400,
 			range: 600,
 			from: from,
 			to: to,
			owner: owner,
			sound: 'laser-shoot.mp3'
		};

		this.spriteFactory.createShot(bulletArgs);
	}

});