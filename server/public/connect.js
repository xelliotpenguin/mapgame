// When not passing any argument, it automatically connects to the server
// which serves the page.
var socket;
var name;
var game;
var myTeamId = 0;
// Default.
var numOfTeams = 4;
var netMode = true;

function connectServer(type, gameStartCallback) {
  socket = io.connect();
  numOfTeams = type;
  socket.emit(Message.GAME, type);

  /* Handle the team id message */
  socket.on(Message.TEAM, function(data) {
      myTeamId = data;
  });

  /* Handle the start message */
  socket.on(Message.START, function() {
      gameStartCallback();
      var grid = game.getWorld();
      for (var tm = numOfTeams; tm < 4; tm++) {
        for (var i = 0; i < grid.numOfCharacters; i++) {
          grid.handleCharacterDead(grid.getCharacterById(tm, i));
        }
      }

      console.log("Team id "+ myTeamId);

      var teamJoinMessage;
      switch (myTeamId) {
          case 0:
              teamJoinMessage = "You spawned at top";
              break;
          case 1:
              teamJoinMessage = "You spawned at bottom";
              break;
          case 2:
              teamJoinMessage = "You spawned at left";
              break;
          case 3:
              teamJoinMessage = "You spawned at right";
              break;
      }
      game.displayMessage(teamJoinMessage);
  });

  /* Handle the move message */
  socket.on(Message.MOVE, function(moveData) {
      var state = moveData[Message.STATE];
      var data = moveData[Message.MOVE];
      console.log(data);
      var moverTeam = parseInt(data[Move.team]);
      var moverIndex = parseInt(data[Move.index]);
      var deltaX = parseInt(data[Move.X]);
      var deltaZ = parseInt(data[Move.Z]);
      var target = game.getWorld().getCharacterById(moverTeam, moverIndex);
      for (var t = 0; t < state.length; t++) {
        if (state[t][State.team] == moverTeam && 
          state[t][State.index] == moverIndex) {
            state[t][State.X] = parseInt(state[t][State.X]) - deltaX;
            state[t][State.Z] = parseInt(state[t][State.Z]) - deltaZ;
        }
      }
      game.getWorld().syncGameState(state);
      target.setDirection(new THREE.Vector3(deltaX, 0, deltaZ));
      target.enqueueMotion(null);
  });

  /* Handle the shot message */
  socket.on(Message.SHOOT, function(data) {
      var team = parseInt(data[Shoot.team]);
      var index = parseInt(data[Shoot.index]);
      var fromX = parseInt(data[Shoot.fromX]);
      var fromZ = parseInt(data[Shoot.fromZ]);
      var toX = parseInt(data[Shoot.toX]);
      var toZ = parseInt(data[Shoot.toZ]);
      var target = game.getWorld().getCharacterById(team, index);
      game.getWorld().shootBullet(target, 
        new THREE.Vector3(fromX, 0, fromZ),
        new THREE.Vector3(toX, 0, toZ));
  });

  /* Handle the move message */
  socket.on(Message.HIT, function(hitData) {
      var state = hitData[Message.STATE];
      var data = hitData[Message.HIT];
      console.log(data);
      game.getWorld().syncGameState(state);
      var team = parseInt(data[Hit.team]);
      var index = parseInt(data[Hit.index]);
      var target = game.getWorld().getCharacterById(team, index);
      for (var t = 0; t < state.length; t++) {
        if (state[t][State.team] == team && 
          state[t][State.index] == index) {
            state[t][State.health] = parseInt(state[t][State.health]) + 30;
        }
      } 
      target.applyDamage(30);
  });

}


function sendMoveMsg(index, x, y, z) {
  if (netMode) {
    var data = {};
    data[Move.team] = myTeamId;
    data[Move.index] = index;
    data[Move.X] = x;
    data[Move.Z] = z;
    socket.emit(Message.MOVE, data);
  }
}

function sendShootMsg(index, from, to) {
  if (netMode) {
    var shoot = {};
    shoot[Shoot.team] = myTeamId;
    shoot[Shoot.index] = index;
    shoot[Shoot.fromX] = from.x;
    shoot[Shoot.fromZ] = from.z;
    shoot[Shoot.toX] = to.x;
    shoot[Shoot.toZ] = to.z;
    socket.emit(Message.SHOOT, shoot);
  }
}

function sendHitMsg(team, index) {
  var hit = {};
  hit[Hit.team] = team;
  hit[Hit.index] = index;
  socket.emit(Message.HIT, hit);
}
