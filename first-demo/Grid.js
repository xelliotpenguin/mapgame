/* Game world */
var Grid = Class.extend({
    // Class constructor
    init: function(width, length, tileSize, scene, camera) {
        'use strict';

        this.gridWidth = width;
        this.gridLength = length;
        this.tileSize = tileSize;
        this.scene = scene;
        this.camera = camera;

        // information about what's being selected
        this.highlightedTiles = null;
        this.currentMouseOverTile = null;
        this.currentCharacterSelected = null;

        // listeners and state
        this.mouseDownListenerActive = true;
        this.mouseOverListenerActive = true;

        // create grid tiles
        this.tiles = new THREE.Object3D();
        this.tilesArray = null;

        this.drawGridSquares(width, length, tileSize);

        // initialize characters
        this.characters = new THREE.Object3D();
        this.numOfCharacters = 3;
        this.characterMeshes = [];
        this.characterList = new Array();
        this.characterFactory = new CharacterFactory();

        var scope = this;
        for (var i = 0; i < this.numOfCharacters; i++) {

            var charArgs = {
                world: scope,
                onDead: scope.removeCharacter,
                team: i
            };

            var character = this.characterFactory.createCharacter(charArgs);
            character.placeAtGridPos(i + 3, 4);
            character.setID(i);
            this.characterList.push(character);
            this.markTileOccupiedByCharacter(i + 3, 4);

            this.characterMeshes.push(character.mesh);
            this.scene.add(character.mesh);
        }

        // bullet info
        this.bullets = [];

        this.setupMouseMoveListener();
        this.setupMouseDownListener();
    },

    getCharacterById: function(id) {
        return this.characterList[id];
    },

    handleCharacterDead: function(character) {
        // if the character was the currently selected unit, then reset tile state
        if (this.currentCharacterSelected == character) {
            // deselect character
            character.deselect();

            // deselect tiles
            this.highlightedTiles.forEach(function(tile) {
                tile.reset();
            });
        }

        // mark tile position as available
        var xPos = character.getTileXPos();
        var zPos = character.getTileZPos();
        this.getTileAtTilePos(xPos, zPos).hasCharacter = false;


        // remove character mesh from list of active meshes
        var index = this.characterMeshes.indexOf(character.mesh);
        if (index > -1) {
            this.characterMeshes.splice(index, 1);
            // remove object form scene
            this.scene.remove(character.mesh);
        }
    },

    handleBulletDestroy: function(bullet) {
        // todo: remove bullet from scene
        var index = this.bullets.indexOf(bullet);
        if (index > -1) {
            this.bullets.splice(index, 1);
            this.scene.remove(bullet.mesh);            
        }
    },

    disableMouseDownListener: function() {
        this.mouseDownListenerActive = false;
    },

    enableMouseDownListener: function() {
        this.mouseDownListenerActive = true;
    },

    disableMouseMoveListener: function() {
        this.mouseMoveListenerActive = false;
    },

    enableMouseMoveListener: function() {
        this.mouseMoveListenerActive = true;
    },

    convertXPosToWorldX: function(tileXPos) {
        return -((this.gridWidth) / 2) + (tileXPos * this.tileSize);
    },

    convertZPosToWorldZ: function(tileZPos) {
        return -((this.gridLength / 2)) + (tileZPos * this.tileSize);
    },


    markCharacterAsSelected: function(character) {
        // deselect previous character if there was one
        if (this.currentCharacterSelected) {
            if (this.currentCharacterSelected != character) {
                this.currentCharacterSelected.deselect();
            }
        }

        this.currentCharacterSelected = character;

        // show character movement speed
        this.displayMovementArea(character);
    },

    markTileAsSelected: function(tile) {
        if (tile == this.currentMouseOverTile) {
            return;
        }

        if (this.currentMouseOverTile) {
            this.currentMouseOverTile.markAsNotSelected();
        }

        this.currentMouseOverTile = tile;
    },

    markTileOccupiedByCharacter: function(xPos, zPos) {

        var tile = this.getTileAtTilePos(xPos, zPos);
        if (tile) {
            tile.hasCharacter = true;
            this.setPFGridCellAccessibility(xPos, zPos, false);
        }
    },

    markTileNotOccupiedByCharacter: function(xPos, zPos) {
        var tile = this.getTileAtTilePos(xPos, zPos);
        if (tile) {
            tile.hasCharacter = false;
            tile.setHasCharacter(false);
            this.setPFGridCellAccessibility(xPos, zPos, true);
        }
    },

    markTileOccupiedByObstacle: function() {

    },


    findPath: function(oldXPos, oldZPos, newXPos, newZPos) {
        //console.log("findPath oldXPos: "+oldXPos+" oldZPos: "+oldZPos +" newXPos: "+newXPos+" newZPos: "+ newZPos);
        return this.pathFinder.findPath(oldXPos, oldZPos, newXPos, newZPos, this.PFGrid.clone());
    },

    displayMovementArea: function(character) {
        // deselect any previously highlighted tiles
        if (this.currentMouseOverTile) {
            this.currentMouseOverTile.reset();
        }

        var characterMovementRange = character.getMovementRange();

        // highlight adjacent squares - collect all tiles from radius
        var tilesToHighlight = this.getTilesInArea(character, characterMovementRange);

        if (this.highlightedTiles) {
            this.highlightedTiles.forEach(function(tile) {
                tile.reset();
            });
        }

        this.highlightTiles(tilesToHighlight);
    },

    highlightTiles: function(tilesToHighlight) {
        tilesToHighlight.forEach(function(tile) {
            tile.setSelectable(true);
            tile.setMovable(true);
            tile.markAsMovable();

        });

        this.highlightedTiles = tilesToHighlight;
    },

    setPFGridCellAccessibility: function(x, z, hasObstacleOnCell) {
        this.PFGrid.setWalkableAt(x, z, hasObstacleOnCell);
    },

    getTilesInArea: function(character, radius) {
        // DO A BFS here
        var tilesToHighlight = [];
        var startTile = this.getTileAtTilePos(character.getTileXPos(), character.getTileZPos());
        if (!startTile) return tilesToHighlight;

        startTile.isObstacle();
        var visited = new Array();
        var nodesInCurrentLevel = new Array();
        var nodesInNextLevel = new Array();
        tilesToHighlight.push(startTile);
        nodesInCurrentLevel.push(startTile);

        while (nodesInCurrentLevel.length > 0 && radius > 0) {
            var currentTile = nodesInCurrentLevel.pop();

            var validNeighbors = this.getNeighborTiles(currentTile.xPos, currentTile.zPos);
            for (var i = 0; i < validNeighbors.length; i++) {
                var neighbor = validNeighbors[i];
                if (_.indexOf(visited, neighbor) == -1 && _.indexOf(nodesInNextLevel, neighbor) == -1) {
                    tilesToHighlight.push(neighbor);
                    nodesInNextLevel.push(neighbor);
                }
            }

            if (nodesInCurrentLevel.length == 0) {
                nodesInCurrentLevel = nodesInNextLevel;
                nodesInNextLevel = new Array();
                radius = radius - 1;
            }
            visited.push(currentTile);
        }

        return tilesToHighlight;
    },

    getNeighborTiles: function(originTileXPos, originTileZPos) {
        var tiles = [];

        tiles.push(this.getTileAtTilePos(originTileXPos - 1, originTileZPos));
        tiles.push(this.getTileAtTilePos(originTileXPos + 1, originTileZPos));
        tiles.push(this.getTileAtTilePos(originTileXPos, originTileZPos - 1));
        tiles.push(this.getTileAtTilePos(originTileXPos, originTileZPos + 1));

        tiles = _.filter(tiles, function(tile) {
            return (tile != null && !tile.isObstacle() && !tile.isCharacter());
        });
        return tiles;
    },

    deselectAll: function() {
        this.characterMeshes.forEach(function(characterMesh) {
            characterMesh.owner.deselect();
        });
    },

    setupMouseMoveListener: function() {
        var scope = this;

        window.addEventListener('mousemove', function(event) {
            scope.onMouseMove(event);
        }, false);
    },

    onMouseMove: function(event) {
        if (this.mouseMoveListenerActive == false) {
            return;
        }

        var scope = this;

        var projector = new THREE.Projector();
        var mouseVector = new THREE.Vector3();

        mouseVector.x = 2 * (event.clientX / window.innerWidth) - 1;
        mouseVector.y = 1 - 2 * (event.clientY / window.innerHeight);

        var raycaster = projector.pickingRay(mouseVector.clone(), scope.camera),
            intersects = raycaster.intersectObjects(scope.tiles.children);

        for (var i = 0; i < intersects.length; i++) {
            var intersection = intersects[i],
                obj = intersection.object.owner;

            obj.onMouseOver();
        }
    },

    setupMouseDownListener: function() {
        var scope = this;

        window.addEventListener('mousedown', function(event) {
            if (scope.mouseDownListenerActive) {
                scope.onMouseDown(event);
            }
        }, false);
    },

    shootBullet: function(owner, from, to) {
        var bullet = new Bullet(this, owner, from, to);
        this.bullets.push(bullet);
        this.scene.add(bullet.mesh);
    },


    onMouseDown: function(event) {
        var scope = this;

        var projector = new THREE.Projector();
        var mouseVector = new THREE.Vector3();

        mouseVector.x = 2 * (event.clientX / window.innerWidth) - 1;
        mouseVector.y = 1 - 2 * (event.clientY / window.innerHeight);

        var raycaster = projector.pickingRay(mouseVector.clone(), scope.camera);

        // recursively call intersects
        var intersects = raycaster.intersectObjects(scope.characterMeshes, true);
        var intersectsWithTiles = raycaster.intersectObjects(scope.tiles.children);

        // should put this at the end of mouseDown
        if (this.currentCharacterSelected) {
            // fire on right click
            if (event.which == 3) {
                console.log("Firing bullet");

                if (intersectsWithTiles.length > 0) {
                    var tileSelected = intersectsWithTiles[0].object.owner;
                    var from = this.currentCharacterSelected.mesh.position.clone();

                    // keep bullets level
                    from.y = 15;
                    var to = new THREE.Vector3(this.convertXPosToWorldX(tileSelected.xPos), 15, this.convertZPosToWorldZ(tileSelected.zPos));

                    // shoot a bullet because you can
					sendShootMsg(this.currentCharacterSelected.id, from, to);
                    this.shootBullet(this.currentCharacterSelected, from, to);
                }
            }
        }

        // move on left click
        if (event.which == 1) {
            // care about characters first, then tile intersects

            // needed so that you can't click on a character and have that result in an immediate movement
            // is there a better pattern for this - chain of event handlers?
            var continueHandlingIntersects = false;

            if (intersects.length > 0) {
                var clickedObject = intersects[0].object.owner;
                clickedObject.onSelect(scope);
            } else {
                continueHandlingIntersects = true;
            }

            if (continueHandlingIntersects) {
                if (intersectsWithTiles.length > 0) {
                    var tileSelected = intersectsWithTiles[0].object.owner;
                    var coordinate = tileSelected.onMouseOver();
                    if (this.currentCharacterSelected && coordinate) {
						var deltaX = coordinate.x - this.currentCharacterSelected.getTileXPos();
						var deltaY = 0;
						var deltaZ = coordinate.z - this.currentCharacterSelected.getTileZPos();
                        this.currentCharacterSelected.setDirection(
                            new THREE.Vector3(deltaX, deltaY, deltaZ));

						// Put the network communication here.
						sendMoveMsg(this.currentCharacterSelected.id, 
								deltaX, deltaY, deltaZ);

                        this.disableMouseMoveListener();
                        this.disableMouseDownListener();

                        this.currentCharacterSelected.enqueueMotion(this,function() {
                            console.log("Motion finished");
                            scope.enableMouseMoveListener();
                            scope.enableMouseDownListener();
                        });
                    }
                }
            }
        }

    },

    getTileAtTilePos: function(xPos, zPos) {
        // TODO: better error handling here?
        if (xPos < 0 || zPos < 0) {
            return null;
        }
        if (xPos >= this.numberSquaresOnXAxis || zPos >= this.numberSquaresOnZAxis) {
            return null;
        }

        return this.tilesArray[xPos][zPos];
    },

    drawGridSquares: function(width, length, size) {
        this.tileFactory = new TileFactory(this, size);

        this.numberSquaresOnXAxis = width / size;
        this.numberSquaresOnZAxis = length / size;

        this.tilesArray = new Array(this.numberSquaresOnXAxis);
        for (var i = 0; i < this.numberSquaresOnXAxis; i++) {
            this.tilesArray[i] = new Array(this.numberSquaresOnZAxis);
        }

        for (var i = 0; i < this.numberSquaresOnXAxis; i++) {
            for (var j = 0; j < this.numberSquaresOnZAxis; j++) {
                var tile = this.tileFactory.createTile(i, j);

                var tileMesh = tile.mesh;

                tileMesh.position.x = this.convertXPosToWorldX(i);
                tileMesh.position.y = 0;
                tileMesh.position.z = this.convertZPosToWorldZ(j);
                tileMesh.rotation.x = -0.5 * Math.PI;

                this.tilesArray[i][j] = tile;

                this.tiles.add(tileMesh);
            }
        }
        this.PFGrid = new PF.Grid(this.numberSquaresOnXAxis, this.numberSquaresOnZAxis);
        this.pathFinder = new PF.AStarFinder();

        this.scene.add(this.tiles);
    },

    getTileSize: function() {
        return this.tileSize;
    },

    getNumberSquaresOnXAxis: function() {
        return this.numberSquaresOnXAxis;
    },

    getNumberSquaresOnZAxis: function() {
        return this.numberSquaresOnZAxis;
    },

    hasObstacleAtCell: function(args) {

    },

    hasCharacterAtCell: function(args) {

    },

    isCellOutOfBounds: function(args) {

    },

    update: function(delta) {
        // update character movements
        for (var i = 0; i < this.characterMeshes.length; i++) {
            var character = this.characterMeshes[i].owner;
            //character.dequeueMotion(this);
            character.update(this, delta);
        }

        // update bullet movements
        this.updateBullets(delta);
    },

    updateBullets: function(delta) {
        for (var i = 0; i < this.bullets.length; i++) {
            var bullet = this.bullets[i];
            bullet.update(delta);
            this.checkBulletCollision(bullet, i);   
        }
    },

    checkOverlap: function(obj1, obj2) {
        var combinedRadius = obj1.getRadius() + obj2.getRadius();
        return combinedRadius * combinedRadius >= obj1.position.distanceToSquared(obj2.position);
    },

    checkBulletCollision: function(bullet, bulletIndex) {
        for (var i = 0; i < this.characterMeshes.length; i++) {
            var character = this.characterMeshes[i].owner;
            // also need to check for bullet team here
            if (character.team != bullet.owner.team && this.checkOverlap(bullet, character)) {
                this.handleBulletDestroy(bullet);
                character.applyDamage(30);
                break;
            }
        }
    }
});
