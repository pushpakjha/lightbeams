'use strict';

// Defines
// Let does not attach to globals object
let http = require('http');
let express = require('express');
let socketio = require('socket.io');
//let rpsGame = require('./rpsGame');

let app = express();
let server = http.createServer(app);
let io = socketio(server);
let maxPlayerCount = 4;

// var app    = require('express')();
// var server = app.listen(app.get('port'), function () {
//   console.log('server listening on port ' + server.address().port);
// });
// var io = require('socket.io')(server);

// Globals
var
	game_server =  { games : [[0,0]], game_count:0, openGame: false },
	UUID        = require('node-uuid'),
	players = {},
	activeGameCount = 0,
	savedGameCount = [],
	activePlayerCount = 0;
		
global.window = global.document = global;

// Main server code
io.on('connection', onConnection);

app.use(express.static(__dirname));
server.listen(4004, () => console.log('Ready to work!'));
//server.listen(8080, '10.132.18.170', () => console.log('Ready to work!'));


function onConnection(sock) {
	
	//Generate a new UUID, looks something like
		//5b2ca132-64bd-4513-99da-90e838ca47d1
		//and store this on their socket/connection
	var userid = UUID();
	var gameCountOnConnection;
		//now we can find them a game to play with someone.
		//if no game exists with someone waiting, they create one and wait.
	gameCountOnConnection = findGame(userid, sock);
	console.log('gameCountOnConnection: ', gameCountOnConnection)
	console.log('game_server.games in 45: ', game_server.games)
	sock.on('disconnect', function () {

			//Useful to know when soomeone disconnects
		//console.log('game_server.games.length: ',game_server.games.length)
		
		/*
		for(var z=0; z < game_server.games.length; z++){
			console.log('z: ',z)
			console.log('game_server.games[z: ',game_server.games[z])
			//console.log('game_server.games[z][0]: ',game_server.games[z][0])
		}
		*/
		//console.log('\t socket.io:: client disconnected ' + userid + '\ngame_server.games: ' + game_server.games);
		//console.log('on Disconnect game_server.game_count: ', game_server.game_count)
		endGame(userid, gameCountOnConnection);

	}); //client.on disconnect
}

function findGame(playerID, playerSock) {
	//console.log('playerID: ',playerID)
	
	//console.log('game_server.game_count: ',game_server.game_count)	
	
	if((activePlayerCount == 0)){
		
		if (typeof game_server.games[activeGameCount] != 'undefined') {
			// current active game is an empty game, but exists
			// activePlayerCount = game_server.games[activeGameCount].length - 1; // this should always be 0, but calculate anyways
		}else{
			// current active game is a new game
			activeGameCount = game_server.game_count;
		}
		
		//Create game and wait
		console.log('No game, creating game and waiting...')
		var waitingPlayer = [playerID, playerSock];
		var gameId = UUID();
		game_server.games[activeGameCount] = [gameId,waitingPlayer];
		//console.log('gameId in runMasterGame: ',gameId)
		// Add player to socket room defined by gameId
		playerSock.join(gameId);
		// New game structure, allow maxPlayerCount players
		//console.log('game_server.games[activeGameCount][0]: ',game_server.games[activeGameCount][0])
		runMasterGame(game_server.games[activeGameCount][1], game_server.games[activeGameCount][0]);
		// Emit initial update to start game
		var initPos = {x: 0, y: 0};
		var fullUpdate = [0,1,initPos,initPos];
		//playerSock.emit('updatePos',fullUpdate);
		
		console.log('savedGameCount in new findGame: ', savedGameCount)
		console.log('activePlayerCount in new findGame: ', activePlayerCount)
		console.log('activeGameCount in new findGame: ', activeGameCount)
		// Last things to update
		activePlayerCount++;
		
		return activeGameCount;
		
	}else if(activePlayerCount < maxPlayerCount){		
		
		var curPlayer = [playerID, playerSock];
		game_server.games[activeGameCount].push(curPlayer);
		//console.log('gameId: ',game_server.games[activeGameCount][0])
		// Add player to socket room defined by gameId
		playerSock.join(game_server.games[activeGameCount][0]);
		
		//console.log('game_server.games[activeGameCount]: ',game_server.games[activeGameCount])
		var strInputList = 'connectIntoGame(';
		for(var x = 1; x < game_server.games[activeGameCount].length; x++){			
			strInputList = strInputList + 'game_server.games[activeGameCount]['+ x + '],';
		}
		
		strInputList = strInputList + 'game_server.games[activeGameCount][0]);';
		
		//console.log(strInputList)
		
		// New game structure, allow 6 players
		eval(strInputList)
		
		// After new player has connected, tell other players to update
		// Need slight delay so we dont clear game board accidently
		setTimeout(function(){ syncGames(curPlayer); }, 500);
		//rpsGame.syncGames(curPlayer);
		
		// Emit initial update to all players to update game board
		var initPos = {x: 0, y: 0};
		var fullUpdate = [1,2,initPos,initPos];		
		
		console.log('savedGameCount in findGame: ', savedGameCount)
		console.log('activePlayerCount in findGame: ', activePlayerCount)
		console.log('activeGameCount in findGame: ', activeGameCount)
		// Last thing to update
		activePlayerCount++;

		if(activePlayerCount == maxPlayerCount){
			// Set up for new game
			if(savedGameCount.length > 0){
				var locAGC = activeGameCount;
				
				activeGameCount = savedGameCount[savedGameCount.length - 1];
				savedGameCount.splice((savedGameCount.length-1), 1);
				//console.log('activeGameCount after splice: ', activeGameCount)
				//console.log('savedGameCount after splice: ', savedGameCount)
				//console.log('game_server.games: ', game_server.games)
				//console.log('game_server.games[locAGC]: ', game_server.games[locAGC])
				//console.log('players[game_server.games[locAGC][0]]: ', players[game_server.games[locAGC][0]])
				//console.log('players: ', players)
				//console.log('game_server.games[locAGC][0]: ', game_server.games[locAGC][0])
				//console.log('players[game_server.games[activeGameCount][0]].length: ', players[game_server.games[activeGameCount][0]].length)
				//console.log('typeof players[game_server.games[activeGameCount][0]]: ', typeof players[game_server.games[activeGameCount][0]])
				if (typeof game_server.games[activeGameCount] != 'undefined') {
					activePlayerCount = game_server.games[activeGameCount].length - 1;
				}else{
					// Game was empty
					activePlayerCount = 0;
				}
				console.log('savedGameCount in findGame locAGC: ', savedGameCount)
				console.log('activePlayerCount in findGame locAGC: ', activePlayerCount)
				console.log('activeGameCount in findGame locAGC: ', activeGameCount)
				return locAGC;
			}else{
				var locAGC;
				console.log('All games full, spawn new game on next connection')
				game_server.game_count++;
				locAGC = activeGameCount;
				activeGameCount = game_server.game_count;
				//gameId = null;
				activePlayerCount = 0;
				return locAGC;
			}						
		}
		
		return activeGameCount;
		
	}
	else{
		console.log('WERE IN A WEIRD CASE: RESET : ', activePlayerCount)
		//We're in a weird case, reset variables for new game to start fresh
		//gameId = null;
		activePlayerCount = 0;
		// Re-launch game
		findGame(playerID, playerSock);
	}
}

function endGame(endUserId, endGameCount){
	
	console.log('game_server.games.length: ',game_server.games.length)
	
	console.log('endGameCount: ', endGameCount)
	console.log('endUserId: ', endUserId)
	
	var disPlayerIndex;
	var disGameId = game_server.games[endGameCount][0];
	
	// Find this players index in local game 
	for(var x=1;x<game_server.games[endGameCount].length;x++){
		if(game_server.games[endGameCount][x][0] == endUserId){
			disPlayerIndex = x;
			break;			
		}		
	}
	console.log('disPlayerIndex: ', disPlayerIndex)
	console.log('disGameId: ', disGameId)
	// Player handling
	game_server.games[endGameCount].splice(disPlayerIndex, 1);
	console.log('game_server.games at 214: ', game_server.games)
	io.to(disGameId).emit('playerDisconnected',disPlayerIndex-1);
	
	// Server handling
	// Remove player from player sock list by game Id
	players[disGameId].splice(disPlayerIndex-1, 1);
	
	// If I was only player in game, and I leave, destory game
	console.log('players.[disGameId] length after disconnect: ',players[disGameId].length)
	if(players[disGameId].length == 0){
		/*
		var removeGameList = [];
		for(var x=0;x<savedGameCount.length;x++){
			if(savedGameCount[x] == endGameCount){
				removeGameList.push(x);				
			}			
		}
		
		removeGameList.sort(function(a, b){return b-a});
		console.log('removeGameList in 235: ', removeGameList)
		for(var y=0;y<removeGameList.length;y++){
			savedGameCount.splice(removeGameList[y],1);	
		}
		*/
		
		console.log('activeGameCount in 240: ', activeGameCount)
		console.log('game_server.games in 241: ', game_server.games)
		//game_server.games.splice(activeGameCount,1);
		activePlayerCount = 0;
		/*
		// Delete game code, needs work
		if(savedGameCount.length != 0){
			activeGameCount = savedGameCount[savedGameCount.length - 1];
			
			if (typeof game_server.games[activeGameCount] != 'undefined') {
				activePlayerCount = game_server.games[activeGameCount].length - 1;
			}else{
				// Game was empty
				activePlayerCount = 0;
			}
			//activePlayerCount = players[game_server.games[activeGameCount][0]].length;
			console.log('activePlayerCount in 241: ', activePlayerCount)
		}else{
			activePlayerCount = 0;
			//gameId = null;
			//game_server.game_count--;			
		}*/
		
		console.log('savedGameCount in length=0: ', savedGameCount)
		console.log('activePlayerCount in length=0: ', activePlayerCount)
		console.log('activeGameCount in length=0: ', activeGameCount)
				
	}else{
		// Add to savedGameCount so we can fill in empty games, only if game isn't already in list
		if((savedGameCount.indexOf(activeGameCount) == -1)&&(endGameCount != activeGameCount)){
		//if(savedGameCount.indexOf(activeGameCount) == -1){	
			savedGameCount.push(activeGameCount);
		}		
		activeGameCount = endGameCount;
		
		// If current active game was in list from earlier, remove it or will cause bugs
		if(savedGameCount.indexOf(activeGameCount) != -1){	
			var removeDup = savedGameCount.indexOf(activeGameCount);
			console.log('REMOVE DUP: ', removeDup)
			savedGameCount.splice(removeDup, 1);
		}	
		
		activePlayerCount = game_server.games[endGameCount].length - 1; // Remove gameId index from length
		console.log('savedGameCount in endGame: ', savedGameCount)
		console.log('activePlayerCount in endGame: ', activePlayerCount)
		console.log('activeGameCount in endGame: ', activeGameCount)
		
		// Re-set onTurn updates since players list/indexes changed
		players[disGameId].forEach((sock, index) => {
			// Remove old listeners
			sock.removeAllListeners('onTurn');
			// When button pressed, update positions
			sock.on('onTurn',(turn) => {
				//console.log('index in onTurn of connect into game: ',index)
				var indexTurn = [index,turn];
				onTurn(indexTurn, players[disGameId],disGameId);
			});			
		});
	}		
}

function runMasterGame(){
	
	//console.log('arguments.length: ',arguments.length)
	// Input handling, will vary based on how many players were in a game already
	if(arguments.length < 2){
		console.log('runMasterGame called without enough inputs')
		return;
	}
	
	players[arguments[arguments.length - 1]] = [];
	
	for (var x = 0; x < arguments.length - 1; x++){
		players[arguments[arguments.length - 1]].push(arguments[x][1]); // Add all player sockets to list
	}	
	
	var startGameInput = [players[arguments[arguments.length - 1]].length,arguments[arguments.length - 1]];
	
	arguments[0][1].emit('startGame',startGameInput);

	// When button pressed, update positions
	arguments[0][1].on('onTurn',(turn) => {
		var indexTurn = [0,turn];
		onTurn(indexTurn, players[arguments[arguments.length - 1]], arguments[1]);
	});
}

function connectIntoGame(){
	
	if(arguments.length < 3){
		console.log('runMasterGame called without enough inputs')
		return;
	}
	
	//console.log('arguments.length: ', arguments.length)
	players[arguments[arguments.length - 1]].push(arguments[arguments.length-2][1]);
	
	for (var x = 0; x <= arguments.length - 2; x++){
		
		//console.log('arguments[x][0] in mainLoop:',arguments[x][0])
		//console.log('x loop value:', x)	
		// Remove old update listener
		arguments[x][1].removeAllListeners('globalUpdate');
		
		arguments[x][1].on('globalUpdate',(globalUpdateList) => {
			players[arguments[arguments.length - 1]].forEach((sock,index)=> {
				var locX = x;
				//console.log('players forEach index: ', index)
				//console.log('globalUpdate globalUpdateList[0]: ', globalUpdateList[0])
				//console.log('globalUpdate globalUpdateList[1]: ', globalUpdateList[1])
				//if(index != locX){
					var syncUpdate = [index,globalUpdateList];
					sock.emit('syncGlobalUpdate',syncUpdate)
				//}
			});			
		});

		arguments[x][1].removeAllListeners('newSpawnPos');
		
		arguments[x][1].on('newSpawnPos',(newSpawn) => {
				
				var newSpawnPosUpdate = [0,newSpawn];
				io.to(arguments[arguments.length-1]).emit('syncNewSpawnPos',newSpawnPosUpdate)	
		});

		arguments[x][1].removeAllListeners('newPowerUp');
		
		arguments[x][1].on('newPowerUp',(updateForOthers) => {				
				//var newSpawnPosUpdate = [0,newSpawn];
				io.to(arguments[arguments.length-1]).emit('syncNewPowerUp',updateForOthers)	
		});
		
		arguments[x][1].removeAllListeners('updatePlayerName');
		
		arguments[x][1].on('updatePlayerName',(updateNames) => {				
				//var newSpawnPosUpdate = [0,newSpawn];
				io.to(arguments[arguments.length-1]).emit('syncPlayerNames',updateNames)	
		});
		
		// Add only new player to list
		if(x == arguments.length-2){
			//console.log('x for new player: ',x)
			
			//console.log('arguments[x][0]:',arguments[x][0])
			// Only the new player needs to launch game, other players need to be told a new player joined
			var connectToGameInput = [players[arguments[arguments.length - 1]].length,arguments[arguments.length - 1]];
			arguments[x][1].emit('connectToGame',connectToGameInput);
			
			//console.log('arguments[x-1][0]:',arguments[x-1][0])
			// For other players in game, tell them new player joined			
			arguments[x-1][1].emit('sendGameBoard');

			// After new player spawns, tell other players to update
			//arguments[x][1].emit('sendGameBoard');
			// Only add new sock for new player
			// When button pressed, update positions
			
			players[arguments[arguments.length - 1]].forEach((sock, index) => {
				// Remove old listeners
				sock.removeAllListeners('onTurn');
				// When button pressed, update positions
				sock.on('onTurn',(turn) => {
					//console.log('index in onTurn of connect into game: ',index)
					var indexTurn = [index,turn];
					onTurn(indexTurn, players[arguments[arguments.length - 1]],arguments[arguments.length-1]);
				});			
			});			
		}		
	}
}

function syncGames(curPlayer){
	
	var playerID = curPlayer[0];
	var playerSock = curPlayer[1];
	
	playerSock.emit('sendGameBoard');	
}

function onTurn(indexTurn, players, gameID){
		
	var pIndex = indexTurn[0];
	var turn = indexTurn[1];
	var travelDist = 1;

	switch (turn){
		case 'up':
			var newPos = {x: 0, y: -travelDist};
			var fullUpdate = [pIndex,players.length,newPos];
			io.to(gameID).emit('updatePos',fullUpdate);
		break;
		case 'down':			
			var newPos = {x: 0, y: travelDist};
			var fullUpdate = [pIndex,players.length,newPos];
			io.to(gameID).emit('updatePos',fullUpdate);
		break;
		case 'left':			
			var newPos = {x: -travelDist, y: 0};
			var fullUpdate = [pIndex,players.length,newPos];
			io.to(gameID).emit('updatePos',fullUpdate);
		break;
		case 'right':			
			var newPos = {x: travelDist, y: 0};
			var fullUpdate = [pIndex,players.length,newPos];
			io.to(gameID).emit('updatePos',fullUpdate);
		break;
	}		
}