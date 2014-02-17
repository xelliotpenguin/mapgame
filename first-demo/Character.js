var CharacterFactory = Class.extend({
    init: function() {

    },

    createCharacter: function(charArgs) {
        var character = new Character(charArgs);
        return character;
    }
});

var Character = Class.extend({

    // Class constructor
    init: function(args) {
        'use strict';

        this.CHARACTER_COOLDOWN_TIMER = 3000;

        this.world = args.world;
        this.team = args.team;
        this.characterSize = args.characterSize;

        this.teamColor = new THREE.Color(Constants.TEAM_COLORS[this.team]);

        this.isActive = false;
        this.alive = true;
        this.id = 0;

        this.xPos = 0;
        this.zPos = 0;

        // Set the character modelisation object
        this.mesh = new THREE.Object3D();
        this.position = this.mesh.position;
        this.mesh.owner = this;

        // Set the vector of the current motion
        this.direction = new THREE.Vector3(0, 0, 0);

        // Set the current animation step
        this.step = 0;
        this.motionInProcess = false;
        this.motionQueue = new Array();

        this.addUnitSelector();
        this.isCoolDown = false;

        this.loader = new THREE.JSONLoader();
        this.loadFile("blendermodels/spheresoldierrolling.js");

        this.highlightedTiles = null;
        this.health = 100;

        var canvas = document.createElement('canvas');
        this.canvas2d = canvas.getContext('2d');
        
        this.coolDownBarTexture = new THREE.Texture(canvas) 
        this.coolDownBarTexture.needsUpdate = true;

        var spriteMaterial = new THREE.SpriteMaterial( { map: this.coolDownBarTexture, useScreenCoordinates: false, alignment: THREE.SpriteAlignment.centerLeft } );
        
        this.barAspectRatio = 10;
        this.coolDownBarXOffset = 0;
        this.coolDownBarZOffset = 0;
        this.coolDownBarYOffset = 55;
        this.coolDownBar = new THREE.Sprite(spriteMaterial);
        this.coolDownBar.scale.set(this.world.getTileSize(), this.world.getTileSize()/this.barAspectRatio, 1.0);
        this.lastRoadMap = new Array();
        this.coolDownCount = 105;
        this.coolDownLeft = 0;

        var canvas2 = document.createElement('canvas');
        this.canvas2d2 = canvas2.getContext('2d');
        this.ammoCountBarTexture = new THREE.Texture(canvas2);
        this.ammoCountBarTexture.needsUpdate = true;

        var ammoCountBarMaterial = new THREE.SpriteMaterial( { map: this.ammoCountBarTexture, useScreenCoordinates: false, alignment: THREE.SpriteAlignment.centerLeft } );
        
        this.ammoCountBarXOffset = -1 * this.world.getTileSize()/2;
        this.ammoCountBarZOffset = 0;
        this.ammoCountBarYOffset = 60;
        this.ammoCountBar = new THREE.Sprite(ammoCountBarMaterial);
        this.ammoCountBar.scale.set(this.world.getTileSize(), this.world.getTileSize()/this.barAspectRatio, 1.0);
        this.maximumAmmoCapacity = 5;
        this.ammoCount = this.maximumAmmoCapacity;
        this.ammoReplenishRate = 0.01;
        this.needsReload = false;

        this.canvas2d2.rect(0, 0, 600, 150);
        this.canvas2d2.fillStyle = "blue";
        this.canvas2d2.fill(); 
        // this.canvas2d2.beginPath();
        // this.canvas2d2.moveTo(0,0);
        // this.canvas2d2.lineTo(0,150);
        // this.canvas2d2.lineTo(600,150);
        // this.canvas2d2.lineTo(600,0);
        // this.canvas2d2.closePath();
        // this.canvas2d2.lineWidth = 20;
        // this.canvas2d2.strokeStyle = 'black';
        // this.canvas2d2.stroke();
        this.ammoCountBar.position.set(this.mesh.position.x + this.ammoCountBarXOffset, 
                                       this.mesh.position.y + this.ammoCountBarYOffset,
                                       this.mesh.position.z + this.ammoCountBarZOffset);        
        this.world.scene.add(this.ammoCountBar );
        this.breakUpdateHere = false;
    },

    loadFile: function(filename, onLoad) {
        var scope = this;

        var fullFilename = filename;

        this.loader.load(fullFilename, function(geometry, materials) {
            // TODO: key this in by name
            // set team color for "wheels"
            materials[0].color = scope.teamColor;
            materials[1].color = scope.teamColor;
            // "iris"
            materials[10].color = scope.teamColor;

            var combinedMaterials = new THREE.MeshFaceMaterial(materials);
            mesh = new THREE.Mesh(geometry, combinedMaterials);

            // scale to correct width / height / depth
            geometry.computeBoundingBox();

            // TODO: should use this bounding box to compute correct scale
            var boundingBox = geometry.boundingBox;
            var width = geometry.boundingBox.max.x - geometry.boundingBox.min.x;
            var height = geometry.boundingBox.max.y - geometry.boundingBox.min.y;
            var depth = geometry.boundingBox.max.z - geometry.boundingBox.min.z;
            mesh.scale.set(10, 10, 10);

            // link the mesh with the character owner object
            this.mesh.owner = scope;
            scope.mesh.add(mesh);
            scope.characterMesh = mesh;
        });
    },

    setID: function(id) {
        this.id = id;
    },

    setAmmoCount: function(number) {
        if (number < this.maximumAmmoCapacity) {
            this.ammoCount = number;
        }
        if (number == this.maximumAmmoCapacity) {
            this.needsReload = false;
        }
        var width = this.world.getTileSize();
        this.ammoCountBar.scale.set(width * (1.0 * this.ammoCount)/this.maximumAmmoCapacity, 
                                                width/this.barAspectRatio, 1.0);
    },

    getRadius: function() {
        return this.characterSize;
    },


    canShoot: function() {
        return this.ammoCount > 1;
    },

    getRadius: function() {
        // TODO: remove this hardcoding
        return 20;
    },

    getHealth: function() {
        return this.health;
    },


    applyDamage: function(damage) {

        this.health -= damage;
        console.log("Health: " + this.getHealth());
        if (this.health < 0) {
            this.world.handleCharacterDead(this);
        }
    },

    enterCoolDown: function() {
    	this.isCoolDown = 1;
    	var scope = this;
    	
        this.canvas2d.rect(0, 0, 800, 200);
        this.canvas2d.fillStyle = "red";
        this.canvas2d.fill();
        this.coolDownBarTexture.needsUpdate = true;
        this.coolDownBar.position.set(this.mesh.position.x - this.world.getTileSize()/2 + this.coolDownBarXOffset,this.mesh.position.y + this.coolDownBarYOffset,this.mesh.position.z + this.coolDownBarZOffset);        
        this.world.scene.add(this.coolDownBar );   

        this.coolDownLeft = this.coolDownCount;
    },


    addUnitSelector: function() {
        // setup unit selector mesh
        // have to supply the radius
        var geometry = new THREE.TorusGeometry(this.world.getTileSize() / 2, 1, 5, 35);
        var material = new THREE.MeshLambertMaterial({
            color: 0xFF0000
        });
        var torus = new THREE.Mesh(geometry, material);
        torus.rotation.x = -0.5 * Math.PI;
        torus.visible = false;

        this.mesh.add(torus);
        this.unitSelectorMesh = torus;
    },

    placeAtGridPos: function(xPos, zPos) {
        this.xPos = xPos;
        this.zPos = zPos;
        this.setCharacterMeshPosX(this.world.convertXPosToWorldX(xPos));
        this.setCharacterMeshPosZ(this.world.convertZPosToWorldZ(zPos));
    },

    getTileXPos: function() {
        return this.xPos;
    },

    getTileZPos: function() {
        return this.zPos;
    },

    getMovementRange: function() {
        return 3;
    },


    onDead: function() {
        this.world.scene.remove(this.mesh);
        this.world.scene.remove(this.coolDownBar);
        this.world.scene.remove(this.ammoCountBar);
    },

    onShoot: function() {
        if (this.ammoCount > 1) {
            this.setAmmoCount(this.ammoCount - 1);
        }
        this.needsReload = true;
    },
    
    // callback - called when unit is selected. Gets a reference to the game state ("world")
    onSelect: function() {
        // don't do anything if this unit was already selected
        if (this.isActive) {
            return;
        }
        // world.deselectAll();
        if (myTeamId == null || this.team == myTeamId) {
          this.unitSelectorMesh.material.color.setRGB(1.0, 0, 0);
          this.unitSelectorMesh.visible = true;
          this.world.markCharacterAsSelected(this);
          this.isActive = true;
        }
    },

    deselect: function() {
        // return to original color
        if (myTeamId == null || this.team == myTeamId) {
            this.unitSelectorMesh.visible = false;
            this.isActive = false;
        }
    },

    // Update the direction of the current motion
    setDirectionWithControl: function(controls) {
        'use strict';
        // Either left or right, and either up or down (no jump or dive (on the Y axis), so far ...)
        var x = controls.left ? 1 : controls.right ? -1 : 0,
            y = 0,
            z = controls.up ? 1 : controls.down ? -1 : 0;
        this.direction.set(x, y, z);
    },

    setDirection: function(direction) {
        this.direction = direction;
    },

    enqueueMotion: function(onMotionFinish) {
        console.log("enqueueMotion \n");
        if (this.isCoolDown == 0) {
            var path = this.world.findPath(this.getTileXPos(), this.getTileZPos(), this.getTileXPos() + this.direction.x,
                this.getTileZPos() + this.direction.z);
            var addNewItem = true;
            var newMotions = new Array();
            for (var i = 1; i < path.length; i++) {
                // checking if path[i], path[i-1], path[i-2] are on the same line
                if (i > 1) {
                    if ((path[i][0] == path[i - 2][0] || path[i][1] == path[i - 2][1]) &&
                        (path[i][0] * (path[i - 1][1] - path[i - 2][1]) + path[i - 1][0] * (path[i - 2][1] - path[i][1]) + path[i - 2][0] *
                            (path[i][1] - path[i - 1][1]) == 0)) {
                        // if they are on the same, line, expand the last element in the motionQueue
                        var lastMotion = newMotions[newMotions.length - 1];
                        lastMotion.x += (path[i][0] - path[i - 1][0]);
                        lastMotion.z += (path[i][1] - path[i - 1][1]);
                        addNewItem = false;
                    }
                }
                if (addNewItem) {
                    newMotions.push(new THREE.Vector3(path[i][0] - path[i - 1][0], 0, path[i][1] - path[i - 1][1]));
                }
                addNewItem = true;
            }

            this.motionQueue.push({
                'sentinel': 'end'
            });
            for (var i = newMotions.length - 1; i >= 0; i--) {
                this.motionQueue.push(newMotions[i]);
            }
            this.motionQueue.push({
                'sentinel': 'start',
                'highlightTiles': path
            });

            if (onMotionFinish) {
                onMotionFinish();
            }
        }
    },

    setCharacterMeshPosX: function(x) {
        this.mesh.position.x = x;
        this.coolDownBar.position.x = x - this.world.getTileSize()/2 + this.coolDownBarXOffset;
        this.ammoCountBar.position.x = x + this.ammoCountBarXOffset;
    },

    setCharacterMeshPosY: function(y) {
        this.mesh.position.y = y;
        this.coolDownBar.position.y = y + this.coolDownBarYOffset;

        this.ammoCountBar.position.y = y + this.ammoCountBarYOffset;
    },

    setCharacterMeshPosZ: function(z) {
        this.mesh.position.z = z;
        this.coolDownBar.position.z = z + this.coolDownBarZOffset;
        this.ammoCountBar.position.z = z + this.ammoCountBarZOffset;
    },

    updateWeaponReload : function(delta) {
        if (this.breakUpdateHere) return;
        if (this.needsReload) {
            this.setAmmoCount(this.ammoCount + this.ammoReplenishRate);
        }
    },

    updateMovementCoolDown: function(delta) {
        if (this.breakUpdateHere) return;
        if (this.isCoolDown) {
            this.coolDownLeft--;
            // update cooldown timer
            if (this.coolDownLeft == 0) {
                this.isCoolDown = false;
                if (this.world.currentSelectedUnits[this.team] == this)
                    this.world.displayMovementArea(this);
            }
        }
        var width = this.world.getTileSize();
        this.coolDownBar.scale.set(width * (this.coolDownCount-this.coolDownLeft)/this.coolDownCount, 
                                            width/this.barAspectRatio, 1.0);
    },



    updateInProgressRotation: function(delta) {
        if (this.breakUpdateHere) return;
        if (this.rotationInProgress) {
            var newAngle = this.mesh.rotation.y + this.angularVelocity * delta;
            if ((newAngle  - this.goalAngle) / (this.goalAngle - this.prevAngle) > 0) {
                this.mesh.rotation.y = this.goalAngle;
                this.rotationInProgress = false;
            } else {
                this.mesh.rotation.y = newAngle;
                this.prevAngle = newAngle;
            }
            this.breakUpdateHere = true;
        }
    },


    updateInProgressLinearMotion: function(delta) {
        if (this.breakUpdateHere) return;
        if (this.motionInProgress) {
            var newMeshX = this.mesh.position.x + this.velocityX * delta;
            var newMeshZ = this.mesh.position.z + this.velocityZ * delta;


            if ((newMeshX - this.goalMeshX) / (this.goalMeshX - this.prevMeshX) > 0) {
                this.setCharacterMeshPosX(this.goalMeshX);
                this.motionInProgress = false;
                this.xPos = this.goalXPos;
            } else {
                this.setCharacterMeshPosX(newMeshX);
                this.velocityX *= 1.05;
            }

            if ((newMeshZ - this.goalMeshZ) / (this.goalMeshZ - this.prevMeshZ) > 0) {
                this.setCharacterMeshPosZ(this.goalMeshZ);
                this.motionInProgress = false;
                this.zPos = this.goalZPos;
            } else {
                this.setCharacterMeshPosZ(newMeshZ);
                this.velocityZ *= 1.05;
            }

            if (this.motionInProgress) {
                this.prevMeshX = newMeshX;
                this.prevMeshZ = newMeshZ;
            }

            this.breakUpdateHere = true;                   
        } 
    },

    update: function(delta) {

        this.breakUpdateHere = false;

        this.updateWeaponReload(delta);
        this.updateMovementCoolDown(delta); 
        this.updateInProgressRotation(delta);
        this.updateInProgressLinearMotion(delta);

        // handle deque action here
        if (this.motionQueue.length > 0 && !this.breakUpdateHere) {
            this.motionInProcess = true;
            var direction = this.motionQueue.pop();
            if (direction.sentinel == 'start') {
                var path = direction.highlightTiles;
                
                if (this.team == myTeamId) {
                    if (this.highlightedTiles){
                        for (var i = 0; i < this.highlightedTiles.length; i++) {
                            this.highlightedTiles[i].reset();
                        }
                    }

                    this.lastRoadMap.length = 0;
                    for (var i = 0; i < path.length; i++) {
                        var roadTile = this.world.getTileAtTilePos(path[i][0], path[i][1]);
                        roadTile.markAsRoadMap();
                        this.lastRoadMap.push(roadTile);
                    }
                }
                this.coolDownLeft = this.coolDownCount;
                return;
            } else if (direction.sentinel == 'end') {
                for (var i = 0; i < this.lastRoadMap.length; i++) {
                    this.lastRoadMap[i].reset();
                }

                this.enterCoolDown();

                return;
            }

            if (direction.x !== 0 || direction.z !== 0) {
                this.rotate(direction);
                // And, only if we're not colliding with an obstacle or a wall ...
                if (this.collide()) {
                    return false;
                }


                this.motionInProgress = true;
                // ... we move the character
                this.prevMeshX = this.mesh.position.x;
                this.prevMeshZ = this.mesh.position.z;

                this.world.markTileNotOccupiedByCharacter(this.getTileXPos(), this.getTileZPos());
                this.goalMeshX = this.mesh.position.x + direction.x * 40;
                this.goalMeshZ = this.mesh.position.z + direction.z * 40;
                
                if (direction.x < 0) {
                    this.velocityX = -100;
                } else if(direction.x > 0) {
                    this.velocityX = 100;
                } else {
                    this.velocityX = 0;
                }

                if (direction.z < 0) {
                    this.velocityZ = -100;
                } else if (direction.z > 0) {
                    this.velocityZ = 100;
                } else {
                    this.velocityZ = 0;
                }

                //this.velocityZ = direction.z?direction.z<0?-10:10:0;
                this.goalXPos = this.xPos + direction.x;
                this.goalZPos = this.zPos + direction.z;
                this.world.markTileOccupiedByCharacter(this.goalXPos, this.goalZPos);
            }
        }
    },

    // Rotate the character
    rotate: function(direction) {
        'use strict';
        // Set the direction's angle, and the difference between it and our Object3D's current rotation
        this.goalAngle = Math.atan2(direction.x, direction.z);

        if (this.goalAngle - this.mesh.rotation.y > Math.PI) {
            this.goalAngle -= 2 * Math.PI;
        }
        this.angularVelocity = (this.goalAngle - this.mesh.rotation.y) * 2;
        if (this.angularVelocity != 0) {
            this.rotationInProgress = true;
            this.prevAngle = this.mesh.rotation.y;
        }
    },

    collide: function() {
        'use strict';
        // INSERT SOME MAGIC HERE
        return false;
    },

    getMesh: function() {
        return this.mesh;
    }
});
