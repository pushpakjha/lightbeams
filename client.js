var sock = io();

sock.on('syncGlobalUpdate', onSyncGlobalUpdate);
sock.on('sendGameBoard', onSendGameBoard);
sock.on('startGame',onStartGame);
sock.on('connectToGame',onConnectToGame);
sock.on('updatePos', onUpdatePosWithTest);
sock.on('syncNewSpawnPos', onSyncNewSpawnPos);
sock.on('playerDisconnected', onPlayerDisconnected);
sock.on('syncNewPowerUp', onSyncNewPowerUp);
sock.on('syncPlayerNames', onSyncPlayerNames);

(function() {
    var lastTime = 0;
    var vendors = ['ms', 'moz', 'webkit', 'o'];
    for(var x = 0; x < vendors.length && !window.requestAnimationFrame; ++x) {
        window.requestAnimationFrame = window[vendors[x]+'RequestAnimationFrame'];
        window.cancelAnimationFrame = window[vendors[x]+'CancelAnimationFrame'] 
                                   || window[vendors[x]+'CancelRequestAnimationFrame'];
    }
 
    if (!window.requestAnimationFrame)
        window.requestAnimationFrame = function(callback, element) {
            var currTime = new Date().getTime();
            var timeToCall = Math.max(0, 16 - (currTime - lastTime));
            var id = window.setTimeout(function() { callback(currTime + timeToCall); }, 
              timeToCall);
            lastTime = currTime + timeToCall;
            return id;
        };
 
    if (!window.cancelAnimationFrame)
        window.cancelAnimationFrame = function(id) {
            clearTimeout(id);
        };
}());

function loadGame(){
//window.onload = function(){
	
	// Globals
	
	// Create off-screen canvas to draw on, then paint to screen to main canvas
	realViewport = document.getElementById("viewport"); // points to the on-screen, original HTML canvas element
	realCtx = realViewport.getContext('2d'); // the drawing context of the on-screen canvas element
	realViewport.width = window.innerWidth;
    realViewport.height = window.innerHeight;
	
	faceCanvas = document.createElement("canvas"); // creates a new off-screen canvas element
	faceCtx = faceCanvas.getContext('2d'); //the drawing context of the off-screen canvas element
	
	faceCanvas.width = realViewport.width; // match the off-screen canvas dimensions
	faceCanvas.height = realViewport.height;
	
	gridCanvas = document.createElement("canvas"); // creates a new off-screen canvas element
	gridCtx = gridCanvas.getContext('2d'); //the drawing context of the off-screen canvas element
	
	gridCanvas.width = realViewport.width; // match the off-screen canvas dimensions
	gridCanvas.height = realViewport.height;
	
	wallCanvas = document.createElement("canvas"); // creates a new off-screen canvas element
	wallCtx = wallCanvas.getContext('2d'); //the drawing context of the off-screen canvas element
	
	wallCanvas.width = realViewport.width; // match the off-screen canvas dimensions
	wallCanvas.height = realViewport.height;
	
	powerUpCanvas = document.createElement("canvas"); // creates a new off-screen canvas element
	powerupCtx = powerUpCanvas.getContext('2d'); //the drawing context of the off-screen canvas element
	
	powerUpCanvas.width = realViewport.width; // match the off-screen canvas dimensions
	powerUpCanvas.height = realViewport.height;
	
	glowCanvas = [];
	glowCtx = [];
	
	for(var l=0;l<3;l++){ // needs to match glowLen, but dont want to make another global...
		glowCanvas[l] = document.createElement("canvas"); // creates a new off-screen canvas element
		glowCtx[l] = glowCanvas[l].getContext('2d'); //the drawing context of the off-screen canvas element
		
		glowCanvas[l].width = realViewport.width; // match the off-screen canvas dimensions
		glowCanvas[l].height = realViewport.height;		
	}
	
	prevPlayerCount = 0;
	
	windowXSize = 6480*0.5;
	windowYSize = 4320*0.5;
	
	//windowXSize = 2260;
	//windowYSize = 1500;
	
	var currPlayerIndex = 0;
	
	then = window.performance.now ?
			 (performance.now() + performance.timing.navigationStart) :
			 Date.now();
			 
	dt = 0.016;
	lastframetime = 0;
	
	gameId = 0;
	showIntroPage = 1;
	isBot = 0;
	
	blockMatrix = [];
	viewMatrix = [];
	locPrevViewWindow = [];
	//prevViewMatrix = [];
	blockSize = 20;
	getInputCnt = 0;
	
	interval = 1000/62.5;
	
	// For tron-like continuous movement
	locMovementDir = 'right';
	
	// For adding/removing players
	playerColors = [];
	blockPos = [];
	score = [];
	
	keyboard = new THREEx.KeyboardState();
	meter = new FPSMeter({
    interval:  100,     // Update interval in milliseconds.
    smoothing: 5,      // Spike smoothing strength. 1 means no smoothing.
    show:      'fps',   // Whether to show 'fps', or 'ms' = frame duration in milliseconds.
    toggleOn:  'click', // Toggle between show 'fps' and 'ms' on this event.
    decimals:  1,       // Number of decimals in FPS number. 1 = 59.9, 2 = 59.94, ...
    maxFps:    60,      // Max expected FPS value.
    threshold: 100,     // Minimal tick reporting interval in milliseconds.

    // FPS Meter position
    position: 'absolute', // Meter position.
    zIndex:   10,         // Meter Z index.
    left:     '5px',      // Meter left offset.
    top:      '5px',      // Meter top offset.
    right:    'auto',     // Meter right offset.
    bottom:   'auto',     // Meter bottom offset.
    margin:   '0 0 0 0',  // Meter margin. Helps with centering the counter when left: 50%;

    // Theme
    theme: 'transparent', // Meter theme. Build in: 'dark', 'light', 'transparent', 'colorful'.
    heat:  1,      // Allow themes to use coloring by FPS heat. 0 FPS = red, maxFps = green.

    // Graph
    graph:   1, // Show history graph.
    history: 20 // How many history states to show in a graph.
	});
	
	rColor = new RColor();
	
	console.log('rColor: ',rColor)
	var sources = ["images/speedUp.png","images/slowDown.png","images/clearPath.png","images/savePath.png","images/star.png"];
	puImages = [];
	  for (var i = 0, length = sources.length; i < length; ++i) {
		puImages[i] = new Image();
		puImages[i].src = sources[i];
	  }
	
	// Populate initial matrix
	for( var y = 0; y <= windowYSize/blockSize; y++ ){
		blockMatrix[y] = [];
		for(var x = 0; x <= windowXSize/blockSize; x++){
			blockMatrix[y][x] = 0;
		}
	}

	for( var y = 0; y <= glowCanvas[0].height/blockSize; y++ ){
		viewMatrix[y] = [];
		//prevViewMatrix[y] = [];
		for(var x = 0; x <= glowCanvas[0].width/blockSize; x++){
			viewMatrix[y][x] = 0;
			//prevViewMatrix[y][x] = 0;
		}
	}

	// Call main drawing function, loops
	console.log('CALLING ANIMATE IN START GAME')
	animate(new Date().getTime());
	console.log('CALLING FIRST INTRO PAGE')
	replay(currPlayerIndex);
	var winLoaded = 1;
}


function onStartGame(startGameInput){
	
	loadGame();
	
	var playerLength = startGameInput[0];
	gameId = startGameInput[1];
	// clear game board on starting a new game
	//clearGameBoard();

	console.log('onStartGame gameID: ',gameId)
	// On new game, clear lists
	playerColors = [];
	blockPos = [];
	score = [];
	powerUpState = [];
	
	// x,y locations of 3 power-ups around global board when new game spawns
	for(var p=0;p<0;p++){ // powerUpsLength
		
		var randXPos = Math.floor(Math.random()*windowXSize/blockSize);
		var randYPos = Math.floor(Math.random()*windowYSize/blockSize);
		/*
		if(p==0){
			var randXPos = 50;
		    var randYPos = 50;			
		}else if(p==1){
			var randXPos = 65;
		    var randYPos = 60;					
		}else if(p==2){
			var randXPos = 70;
		    var randYPos = 75;					
		}*/
		
		// Speed up/slow down are broken, so only spawn power ups 2-4
		var powerUpType = Math.floor(Math.random()*3)+2;
		//console.log('powerUpType: ', powerUpType);
		//var powerUpType = Math.floor(Math.random()*5); // allow all power ups 0-4
		//var powerUpType = 0;
		var newRandPowerUp = [randXPos,randYPos,powerUpType]; // x,y locations of 3 power-ups around global board
		// Power up types
		// ["images/speedUp.png","images/slowDown.png","images/clearPath.png","images/savePath.png","images/star.png"]
		powerUpState.push(newRandPowerUp);
	}
	

	for(var x = 0; x < playerLength; x++){
		playerColors[x] = rColor.get(true, 0.8, 0.95);
		console.log('playerColors[x]: ', playerColors[x]);		
		var randXPos = Math.floor(Math.random()*(windowXSize/blockSize));
		var randYPos = Math.floor(Math.random()*(windowYSize/blockSize));
		blockPos[x] = {x: randXPos, y: randYPos};
		//blockPos[x] = {x: 10, y: 10};
		score[x] = [0, 0, 0, [null,null],""]; // Trail length, kills, deaths, [power-up state, power up start time], playerName
		prevPlayerCount = 0;
		blockMatrix[blockPos[x].y][blockPos[x].x] = playerColors[x];	
	}
	
	currPlayerIndex = playerLength - 1;
	
	// Globals
	totalPlayers = {color: playerColors, blockPos: blockPos, score: score, powerUps: powerUpState};	
	//console.log('totalPlayers in onStartGame: ', totalPlayers)
	// Spawn bot if you're first and only player
	spawnBot(gameId);
}

function onConnectToGame(connectToGameInput){	
	
	loadGame();
	
	var playerLength = connectToGameInput[0];
	var playerColors2 = [];
	gameId = connectToGameInput[1];
	
	console.log('onConnectToGame gameID: ',gameId)
	console.log('onConnectToGame playerLength: ',playerLength)
	
	//console.log('blockPos BEFORE: ',blockPos)
	for(var x = 0; x < playerLength; x++){
		
		// Needs to be updated from other players actual positions
		blockPos[x] = {x:0, y:0};
		playerColors2[x] = '#aaaaaa';
		
		console.log('onConnectToGame x: ',x)
		console.log('playerColors2: ',playerColors2)
		//console.log('blockPos[x]: ',blockPos[x])
		if(x == playerLength - 1){
			// Generate random color
			console.log('playerColors2[x]: ',playerColors2[x])
			console.log('x: ',x)
			playerColors2[x] = rColor.get(true, 0.8, 0.95);
			console.log('playerColors2 in x-1: ',playerColors2)
			var randXPos = Math.floor(Math.random()*150);
			var randYPos = Math.floor(Math.random()*75);
			blockPos[x] = {x: randXPos, y: randYPos};
			score[x] = [0, 0, 0, [null,null],""]; // Trail length, kills, deaths, [power-up state, power up start time], playerName
			prevPlayerCount = 0;
			blockMatrix[blockPos[x].y][blockPos[x].x] = playerColors2[x];
			console.log('playerColors2[x] AFTER: ',playerColors2[x])
			//console.log('blockPos[x] AFTER: ',blockPos[x])
		}
	}
	
	powerUpState = [];
	currPlayerIndex	= playerLength - 1;
	//console.log('blockPos AFTER: ',blockPos)
	// Global update
	console.log('playerColors2[1] in global update: ',playerColors2[1])
	totalPlayers = {color: playerColors2, blockPos: blockPos, score: score, powerUps: powerUpState};
	console.log('totalPlayers onConnectToGame AFTER: ',totalPlayers.color[1])
}

function spawnBot(gameId){
	
	playerLength = 2;
	
	//console.log('onSpawnBot gameID: ',gameId)
	// clear game board on starting a new game
	//clearGameBoard();

	//console.log('blockPos BEFORE: ',blockPos)
	for(var x = 0; x < playerLength; x++){
		//console.log('x in spawnBot: ',x)
		// Needs to be updated from other players actual positions
		if(x==0){
			var randXPos = Math.floor(Math.random()*(windowXSize/blockSize - 1));
			var randYPos = Math.floor(Math.random()*(windowYSize/blockSize - 1));
			blockPos[x] = {x: randXPos, y: randYPos};
			//blockPos[x] = {x: 10, y: 10};
			playerColors[x] = rColor.get(true, 0.8, 0.95);
			//console.log('totalPlayers in spawnBot: ',totalPlayers)
		}
		
		//console.log('onConnectToGame x: ',x)
		//console.log('playerColors[x]: ',playerColors[x])
		//console.log('blockPos[x]: ',blockPos[x])
		if(x == playerLength - 1){
			// Generate random bot color
			//playerColors[x] = '#' + Math.floor(Math.random()*16777215).toString(16);
			playerColors[x] = '#aa2244';

			var randXPos = Math.floor(Math.random()*150);
			var randYPos = Math.floor(Math.random()*75);
			blockPos[x] = {x: randXPos, y: randYPos};
			//blockPos[x] = {x: 20, y: 20};
			score[x] = [0, 0, 0, [null,null],"Bot 1"]; // Trail length, kills, deaths, [power-up state, power up start time], playerName
			prevPlayerCount = 0;
			blockMatrix[blockPos[x].y][blockPos[x].x] = playerColors[x];
			//console.log('playerColors[x] AFTER: ',playerColors[x])
			//console.log('blockPos[x] AFTER: ',blockPos[x])
		}
	}
	
	powerUpState = totalPlayers.powerUps;
	//console.log('blockPos AFTER: ',blockPos)
	// Global update
	totalPlayers = {color: playerColors, blockPos: blockPos, score: score, powerUps: powerUpState };
	//console.log('totalPlayers after spawnBot: ',totalPlayers)
}

function randomColor(brightness){
  function randomChannel(brightness){
    var r = 255-brightness;
    var n = 0|((Math.random() * r) + brightness);
    var s = n.toString(16);
    return (s.length==1) ? '0'+s : s;
  }
  return '#' + randomChannel(brightness) + randomChannel(brightness) + randomChannel(brightness);
}

function onPlayerDisconnected(disPlayerIndex){	
	
	//console.log('PLAYER DISCONNECTED: ',disPlayerIndex)
	//console.log('PLAYER DISCONNECTED totalPlayers BEFORE: ',totalPlayers)
	var disColorList = totalPlayers.color;
	var disBlockPosList = totalPlayers.blockPos;
	var disScoreList = totalPlayers.score;
	var disPowerUpsList = totalPlayers.powerUps;
	//console.log('PLAYER DISCONNECTED disColorList BEFORE: ',disColorList)
	//console.log('PLAYER DISCONNECTED disBlockPosList BEFORE: ',disBlockPosList)
	//console.log('PLAYER DISCONNECTED totalPlayers.color[disPlayerIndex]: ',totalPlayers.color[disPlayerIndex])
	// Clear board
	clearBoardOfPlayer(totalPlayers.color[disPlayerIndex]);
	
	// Create new lists without this player
	disColorList.splice(disPlayerIndex, 1);
	disBlockPosList.splice(disPlayerIndex, 1);
	disScoreList.splice(disPlayerIndex, 1);
	disPowerUpsList.splice(disPlayerIndex, 1);
	// Push new lists to global update
	totalPlayers = {color: disColorList, blockPos: disBlockPosList, score: disScoreList, powerUps: disPowerUpsList};
	console.log('PLAYER DISCONNECTED totalPlayers AFTER: ',totalPlayers)
	// Update if current player moved in list
	if(disPlayerIndex < currPlayerIndex){
		currPlayerIndex = currPlayerIndex - 1;
	}	
}

function onSyncNewSpawnPos(newSpawnPosUpdate){	
	var index = newSpawnPosUpdate[0];
	var newSpawnIndex = newSpawnPosUpdate[1][0];
	var newSpawnPos = newSpawnPosUpdate[1][1];
	var powerUpType = newSpawnPosUpdate[1][2];
	
	var locBlockPos = totalPlayers.blockPos;
	locBlockPos[newSpawnIndex] = newSpawnPos;
	
	// Clear blocks, otherwise 1 artifact block is generally left on screen
	if(powerUpType != 3){
		clearBoardOfPlayer(totalPlayers.color[newSpawnIndex]);
	}
	
	//Push update
	totalPlayers.blockPos = locBlockPos;
	blockPos = totalPlayers.blockPos;
}

function onSyncGlobalUpdate(syncUpdate){	
	
	var index = syncUpdate[0];
	var locTotalPlayers = syncUpdate[1][0];
	var locBlockMatrix = syncUpdate[1][1];
	
	var locBlockPos = totalPlayers.blockPos;
	var locPlayerColor = totalPlayers.color;
	var locScore = totalPlayers.score;
	var locPowerUps = locTotalPlayers.powerUps;
	// Global update
	//console.log('locTotalPlayers: ',locTotalPlayers)
	//console.log('locBlockMatrix: ',locBlockMatrix)
	//console.log('totalPlayers.color BEFORE: ',totalPlayers.color)
	//console.log('totalPlayers.blockPos BEFORE: ',totalPlayers.blockPos)
	//console.log('locTotalPlayers.color BEFORE: ',locTotalPlayers.color)
	//totalPlayers = locTotalPlayers;
	//blockMatrix = locBlockMatrix;
	//console.log('blockPos BEFORE: ',blockPos)
	for(var x=0;x<locTotalPlayers.blockPos.length;x++){
		//console.log('x in for loop: ',x)
		//console.log('blockPos[x] in onSyncGlobalUpdate BEFORE: ',blockPos[x])
		if((locTotalPlayers.blockPos[x].x == 0)&&(locTotalPlayers.blockPos[x].y == 0)){
			// Skip update if default
			locBlockPos[x] = totalPlayers.blockPos[x];
			locScore[x] = totalPlayers.score[x];
			//locPowerUps[x] = totalPlayers.powerUps[x];
		}else{
			locBlockPos[x] = locTotalPlayers.blockPos[x];
			locScore[x] = locTotalPlayers.score[x];
			//locPowerUps[x] = locTotalPlayers.powerUps[x];
		}
		if((locTotalPlayers.color[x] === '#aaaaaa')||(locTotalPlayers.color[x] === '#aa2244')){
			//console.log('SAME COLOR DETECTED')
			//console.log('SAME COLOR DETECTED locPlayerColor[x]: ', locPlayerColor[x])
			//console.log('SAME COLOR DETECTED totalPlayers.color[x]: ',totalPlayers.color[x])
			locPlayerColor[x] = totalPlayers.color[x];
			//console.log('SAME COLOR DETECTED locPlayerColor[x] AFTER: ', locPlayerColor[x])
		}else{
			//console.log('locTotalPlayers.color[x]: ',locTotalPlayers.color[x])
			locPlayerColor[x] = locTotalPlayers.color[x];
			//console.log('locPlayerColor[x]: ',locPlayerColor[x])
		}
		//console.log('blockPos[x] in onSyncGlobalUpdate: ',blockPos[x])
		//console.log('playerColors[x] in onSyncGlobalUpdate: ',playerColors[x])
		//console.log('locTotalPlayers.color[x] in onSyncGlobalUpdate: ',locTotalPlayers.color[x])
	}
	//console.log('locPlayerColor in onSyncGlobalUpdate 184: ',locPlayerColor)
	for(var y=1;y<totalPlayers.blockPos.length;y++){
		locBlockPos[y] = totalPlayers.blockPos[y];
		locPlayerColor[y] = totalPlayers.color[y];
		locScore[y] = totalPlayers.score[y];
		//locPowerUps[y] = totalPlayers.powerUps[y];
	}
	//console.log('locBlockPos AFTER: ',locBlockPos)
	//console.log('locPlayerColor in onSyncGlobalUpdate 189: ',locPlayerColor)
	
	
	totalPlayers = {color: locPlayerColor, blockPos: locBlockPos, score: score, powerUps: locPowerUps};
	//console.log('totalPlayers.blockPos AFTER: ',totalPlayers.blockPos)
	//console.log('totalPlayers.color AFTER: ',totalPlayers.color)
	blockPos = totalPlayers.blockPos;
	playerColors = totalPlayers.color;
	score = totalPlayers.score;
	powerUpState = totalPlayers.powerUps;
	blockMatrix = locBlockMatrix;
	
	// clear game board of bot
	if(totalPlayers.blockPos.length == 2){
		//console.log('onSyncGlobalUpdate clearBoardOfPlayer aa2244')
		clearBoardOfPlayer('#aa2244');
	}
}

function onSendGameBoard(){		
	// Global update
	//console.log('emitting totalPlayers: ',totalPlayers)
	//console.log('emitting blockMatrix: ',blockMatrix)
	console.log('Doing onSendGameBoard: ', currPlayerIndex)
	
	for(var x=0;x<totalPlayers.blockPos.length;x++){
		console.log('x: ',x)
		console.log('totalPlayers.blockPos[x].x', totalPlayers.blockPos[x].x)
		console.log('totalPlayers.blockPos[x].y', totalPlayers.blockPos[x].y)
		console.log('totalPlayers.color[x]', totalPlayers.color[x])
	}
	console.log('totalPlayers.powerUps', totalPlayers.powerUps)
	
	var globalUpdateList = [totalPlayers, blockMatrix];
	sock.emit('globalUpdate',globalUpdateList);
}

function onUpdatePosWithTest(fullUpdate){
	
	// First make update
	var curP = fullUpdate[0];
	var beforeXmove = totalPlayers.blockPos[curP].x;
	var beforeYmove = totalPlayers.blockPos[curP].y;
	//console.log('beforeXmove pre: ', beforeXmove)
	//console.log('beforeYmove pre: ', beforeYmove)
	onUpdatePos(fullUpdate);
	// Now test update
	
	//console.log('curP: ', curP)
	//console.log('totalPlayers.blockPos[curP]: ', totalPlayers.blockPos[curP])
	//console.log('fullUpdate[2]: ', fullUpdate[2])
	//console.log('beforeXmove post: ', beforeXmove)
	//console.log('beforeYmove post: ', beforeYmove)
	var xDif = Math.abs(totalPlayers.blockPos[curP].x - beforeXmove);
	var yDif = Math.abs(totalPlayers.blockPos[curP].y - beforeYmove);
	//console.log('xDif: ', xDif)
	//console.log('yDif: ', yDif)
	if((xDif + yDif) > 1){
		console.log('WARNING TEST UPDATE POS FAILED, INVESTIGATE')
	}
	
}


function onUpdatePos(fullUpdate){
	var pIndex = fullUpdate[0];
	//var index = fullUpdate[1];
	var playerLen = fullUpdate[1];
	var newPos = {x:0, y:0};
	//console.log('pIndex: ',pIndex)
	var updatedPos = [{x:0, y:0},{x:0, y:0}];
	var newTestPos = [{x:0, y:0},{x:0, y:0}];
	//console.log('updatedPos 1: ',updatedPos)
	//console.log('newTestPos 1: ',newTestPos)
	//var speedLimit = 1+Math.floor(totalPlayers.score[pIndex][0]/200);
	var speedLimit = 1;
	var godMode = 1; // Used for testing vs bot
	//console.log('playerLen: ', playerLen)
	//console.log('totalPlayers.score[pIndex][3][0]: ', totalPlayers.score[pIndex][3][0])
	
	// Set bot is only 1 player
	if(playerLen == 1){
		isBot = 1;
	}else{
		isBot = 0;
	}
	// Handle speed changing power-ups
	if(totalPlayers.score[pIndex][3][0] == 0){
		if(totalPlayers.score[pIndex][3][1] == null){
			speedLimit = speedLimit * 2;
			totalPlayers.score[pIndex][3][1] = performance.now(); // populate time field on power-up start
		}
		//console.log('up(performance.now()-totalPlayers.score[pIndex][3][1]): ', (performance.now()-totalPlayers.score[pIndex][3][1]))
		if((performance.now()-totalPlayers.score[pIndex][3][1]) < 5000){
			speedLimit = speedLimit * 2;
		}else{
			totalPlayers.score[pIndex][3][0] = null; // after power-up is over, reset
			totalPlayers.score[pIndex][3][1] = null;
		}
	}
	if(totalPlayers.score[pIndex][3][0] == 1){
		if(totalPlayers.score[pIndex][3][1] == null){
			speedLimit = speedLimit * 0.5;
			totalPlayers.score[pIndex][3][1] = performance.now(); // populate time field on power-up start
		}
		//console.log('down(performance.now()-totalPlayers.score[pIndex][3][1]): ', (performance.now()-totalPlayers.score[pIndex][3][1]))
		if((performance.now()-totalPlayers.score[pIndex][3][1]) < 5000){
			speedLimit = speedLimit * 0.5;
		}else{
			totalPlayers.score[pIndex][3][0] = null; // after power-up is over, reset
			totalPlayers.score[pIndex][3][1] = null;
		}
	}
	
	// Max/min speed
	if(speedLimit > 10){
		speedLimit = 10; 
	}
	if(speedLimit < 1){
		speedLimit = 1; 
	}
	//console.log('speedLimit: ', speedLimit)
	// Add 1 to players score
	totalPlayers.score[pIndex][0]++;
	for(var s = 0;s<speedLimit;s++){
	//pIndex = fullUpdate[0];
	//console.log('newTestPos 2: ',newTestPos)
	for(var x = 0;x < totalPlayers.blockPos.length;x++){
		var amBot = 0;
		//console.log('x: ',x)
		//console.log('pIndex: ',pIndex)
		//console.log('newTestPos 3: ',newTestPos)
		//console.log('totalPlayers.blockPos: ',totalPlayers.blockPos)
		//console.log('totalPlayers.blockPos[x]: ',totalPlayers.blockPos[x])
		//console.log('currPlayerIndex: ',currPlayerIndex)
		//console.log('newPos BEFORE: ',newPos)
		if(pIndex == x){
			newPos = fullUpdate[2];
		}
		//console.log('totalPlayers.blockPos[x]: ',totalPlayers.blockPos[x])
		if((isBot == 1)&&(pIndex != x)){
			pIndex = 1;
			amBot = 1;
			if(totalPlayers.score[pIndex][0] == 0){
				totalPlayers.score[pIndex][0] = 2; // On first move, gets extra score, workaround for initial leaderboard bug
			}
			else{
				totalPlayers.score[pIndex][0]++; // update bot score
			}
			//console.log('new bot pIndex: ',pIndex)
			newPos = getBotNewPos(totalPlayers.blockPos);
			//newPos = {x:1, y:0};
			//console.log('getBotNewPos: ',newPos)
		}
		//console.log('newTestPos before: ',newTestPos)
		//console.log('newPos AFTER: ',newPos)
		newTestPos[x] = calcNewBlockPos(newPos,totalPlayers.blockPos[x]); 
		
		//console.log('newTestPos after: ',newTestPos)
		//Check for collision with wall
		var postColl;
		postColl = checkWallCollisions(newTestPos[x]);
		newTestPos[x] = postColl[0];
		var wallCollOccur = (postColl[1] || postColl[2]);
		//console.log('PLAYER COLLISION DETECTED with wall: ', wallCollOccur)
		
		// Check for collision with any player
		//var collRes = [];
		var collRes = checkPlayerCollisions(newTestPos[x]);
		//console.log('PLAYER COLLISION DETECTED with player: ', collRes)
		
		// Check if we hit a power-up
		var puColl;
		puColl = checkPowerUpCollisions(newTestPos[x]);
		if((totalPlayers.score[x][3][0] == null)||(puColl != null)){
			totalPlayers.score[x][3][0] = puColl; // activate power up for that player
			totalPlayers.score[x][3][1] = null;
		}
		
		// If we hit power-up, activate it for that player and spawn new power-up
		if(puColl != null){
			console.log('puColl has value: ',puColl)
			totalPlayers.score[x][3][0] = puColl; // set power-up on for that player
			spawnNewPowerUp(newTestPos[x],puColl,x,pIndex);
		}
		
		// Handle certain power-ups here
		if(totalPlayers.score[x][3][0] == 2){ // Handle "reset trail but dont die" power-up here
			clearBoardOfPlayer(totalPlayers.color[x]);
			totalPlayers.score[x][3][0] = null; // reset power up state
		} 
		
		if((godMode)&&(amBot == 0)){
			totalPlayers.score[pIndex][3][0] = 4;
		}
		if(totalPlayers.score[pIndex][3][0] == 4){ // Handle "ignore collisions" power-up here
			if(totalPlayers.score[pIndex][3][1] == null){
				collRes = 0;
				totalPlayers.score[pIndex][3][1] = performance.now(); // populate time field on power-up start
			}
			//console.log('down(performance.now()-totalPlayers.score[pIndex][3][1]): ', (performance.now()-totalPlayers.score[pIndex][3][1]))
			if((performance.now()-totalPlayers.score[pIndex][3][1]) < 8000){
				collRes = 0;
			}else{
				totalPlayers.score[pIndex][3][0] = null; // after power-up is over, reset
				totalPlayers.score[pIndex][3][1] = null;
			}
		}
		
		// If we hit wall or a player, handle death
		if((wallCollOccur || collRes[0])&&(pIndex == x)){
			console.log('CLEAR BOARD')
			console.log('collRes: ', collRes)
			totalPlayers.score[pIndex][0] = 0;
			
			if(collRes[0] == 1){
				var winnerIndex = totalPlayers.color.indexOf(collRes[1]);
				if(winnerIndex != x){
					console.log('winnerIndex: ', winnerIndex)
					console.log('totalPlayers.score: ', totalPlayers.score)
					totalPlayers.score[winnerIndex][1]++; // Add to players win count
				}
			}
			var randXPos = Math.floor(Math.random()*150);
			var randYPos = Math.floor(Math.random()*75);
			
			if((currPlayerIndex == x)&&(amBot != 1)){
				totalPlayers.blockPos[x] = {x: randXPos, y: randYPos };
				//Update score
				totalPlayers.score[x][2]++; // Add 1 to death count
				newPos = {x:0,y:0};
				newTestPos[x] = calcNewBlockPos(newPos,totalPlayers.blockPos[x]);
				console.log('CLEAR BOARD newTestPos[x] I DIED: ',newTestPos[x])
				//console.log('self totalPlayers.score[x][3][0]: ',totalPlayers.score[x][3][0])
				var newSpawn = [x,newTestPos[x],totalPlayers.score[x][3][0]];
				if(totalPlayers.score[x][3][0] != 3){ // Handle "die but dont reset trail" power-up here
					//console.log('CLEAR SELF: ',then-window.performance.now())
					clearBoardOfPlayer(totalPlayers.color[x]);
					replay(x); // If I died go to intro page
				}	
				sock.emit('newSpawnPos',newSpawn);
			}else{
				newPos = {x:0,y:0};
				newTestPos[x] = calcNewBlockPos(newPos,totalPlayers.blockPos[x]);
				//Update score
				//console.log('x: ',x);
				//console.log('totalPlayers.score[x][2]: ',totalPlayers.score[x][2]);
				totalPlayers.score[x][2]++; // Add 1 to death count
				//console.log('totalPlayers.score[x][2] after: ',totalPlayers.score[x][2]);
				console.log('CLEAR BOARD newTestPos[x] someone else DIED: ',newTestPos[x])
				//console.log('other totalPlayers.score[x][3][0]: ',totalPlayers.score[x][3][0])
				//clearBoardOfPlayer(totalPlayers.color[x]);
				if(totalPlayers.score[x][3][0] != 3){ // Handle "die but dont reset trail" power-up here
					//console.log('CLEAR OTHER: ',then-window.performance.now())
					clearBoardOfPlayer(totalPlayers.color[x]);
				}
			}
			totalPlayers.score[x][3][0] = null; // on death, re-set power-ups
			totalPlayers.score[x][3][1] = null;
		}
		// Reset pos for next player
		newPos = {x:0, y:0};
	}
	
	// Update global pos variables
	//console.log('totalPlayers.blockPos.length: ', totalPlayers.blockPos.length)
	for(var x=0;x<totalPlayers.blockPos.length;x++){
		totalPlayers.blockPos[x] = newTestPos[x];
		//console.log('totalPlayers.color[x]: ',totalPlayers.color[x])
		blockMatrix[newTestPos[x].y][newTestPos[x].x] = totalPlayers.color[x];
	} // update global pos loop
	}// s, speedLimit loop
}

function calcNewBlockPos(newPos1,pos){
	
	//console.log('newPos1.x: ',newPos1.x)
	//console.log('newPos1.y: ',newPos1.y)
	//console.log('pos.x: ',pos.x)
	//console.log('pos.y: ',pos.y)
	var updatedCalcPos;
	updatedCalcPos = {x: pos.x + newPos1.x, y: pos.y + newPos1.y};
	//console.log('updatedCalcPos in calcNewBlockPos: ',updatedCalcPos)
	return updatedCalcPos;
}

function animate(t){
	
	// Animation loop
	requestAnimationFrame(animate, realViewport);
	
	if(!showIntroPage){
	var showFPS;
	
	
	//var fps = 62.5;
	var now = window.performance.now ?
			 (performance.now() + performance.timing.navigationStart) :
			 Date.now();

	
	var delta;

	//console.log('now: ',now)
	//console.log('then: ',then)
	delta = now - then;
	//console.log('delta: ',delta)
		
	//if(delta > interval){
		getInputCnt++;
		dt = lastframetime ? ( (t - lastframetime)/1000.0) : 0.016;
	
		lastframetime = t;
		showFPS = 1/dt;
		
		//console.log('showFPS: ',showFPS)
		
		// update time/interval code
		//console.log('delta beyond interval: ',delta)
		
		then = now - (delta % interval);
	
		// Draw code
		// Main view port
		realViewport.width = window.innerWidth;
		realViewport.height = window.innerHeight;
		
		faceCanvas.width = realViewport.width; // clears face canvas
		faceCanvas.height = realViewport.height;
		gridCanvas.width = realViewport.width; // clears grid canvas
		gridCanvas.height = realViewport.height;
		wallCanvas.width = realViewport.width; // clears wall canvas
		wallCanvas.height = realViewport.height;
		powerUpCanvas.width = realViewport.width; // clears power up canvas
		powerUpCanvas.height = realViewport.height;
		
		// Clear glow canvas's
		for(var l=0;l<3;l++){	// needs to match glowLen, but dont want to make another global...		
			glowCanvas[l].width = realViewport.width;
			glowCanvas[l].height = realViewport.height;		
		}
	
		//console.log('fps: ',fps)
		if(getInputCnt >= 3){
		// Grab inputs
			updateInputs();
			getInputCnt = 0;	
		}
		
		// Main draw code
		mainDraw();	
		
		realCtx.drawImage( gridCanvas, 0, 0 ); // draw the grid layer
		
		realCtx.drawImage( wallCanvas, 0, 0 ); // draw the wall layer
		
		realCtx.drawImage( powerUpCanvas, 0, 0 ); // draw powerup layer	
		
		for(var l=0;l<3;l++){ // needs to match glowLen, but dont want to make another global...		
			realCtx.drawImage( glowCanvas[l], 0, 0 ); // draw the main off-screen canvas	layer
		}		
		//realCtx.drawImage( viewport, 0, 0 ); // draw the main off-screen canvas	layer
		realCtx.drawImage( faceCanvas, 0, 0 ); // draw face layer				
	//}
	
	// Draw FPS meter
	meter.tick();
	}// if(!showIntroPage)	
}

function replay(x){
	var endScrn = document.getElementById('endScreen');
	var endScrnCnt = document.getElementById('endScreenContent');
	
	// Make input text field for nickname
	//var nameInput = document.createElement("input");
	var nameInput = document.getElementById("textInputBox");
	nameInput.setAttribute("placeholder", "Enter nickname");
	nameInput.setAttribute("value", "");
	nameInput.setAttribute("style", "width:200px");
	
	document.getElementById("textInputBox")
		.addEventListener("keyup", function(event) {
		event.preventDefault();
		if (event.keyCode == 13) {
			document.getElementById("endButton").click();
		}
	});
	//nameInput.style.top = winH/2 + "px";
	//nameInput.style.left = winW/2 + "px";
	
	// Make button
	var myButton = document.createElement("input");
	myButton.type = "button";
	myButton.value = "Start";
	//myButton.setAttribute("onclick", updateNickName(nameInput.getAttribute("value")));
	
	// Get the modal
	var iModal = document.getElementById('myModal');
	var modalContent = document.getElementById('modalContent');

	// Get the button that opens the modal
	var btn = document.getElementById("helpButton");
	
	// Get the <span> element that closes the modal
	var iSpan = document.getElementById("iSpan");

	// When the user clicks the button, open the modal
	btn.onclick = function() {
		iModal.style.display = "block";
	}

	// When the user clicks on <span> (x), close the modal
	iSpan.onclick = function() {
		iModal.style.display = "none";
		setFocus("textInputBox");
	}
	
	// Get the about modal
	var aboutModal = document.getElementById('myAboutModal');
	var aboutModalContent = document.getElementById('aboutModalContent');
	
	// Get the button that opens the about modal
	var aboutBtn = document.getElementById("aboutButton");
	
	// Get the <span> element that closes the modal
	var aboutSpan = document.getElementById("aboutSpan");

	// When the user clicks the button, open the modal
	aboutBtn.onclick = function() {
		aboutModal.style.display = "block";
	}

	// When the user clicks on <span> (x), close the modal
	aboutSpan.onclick = function() {
		aboutModal.style.display = "none";
		setFocus("textInputBox");
	}

	// When the user clicks anywhere outside of the modal, close it
	window.onclick = function(event) {
		if (event.target == iModal) {
			console.log('ispan click')
			iModal.style.display = "none";
		}
		if (event.target == aboutModal) {
			console.log('aboutSpan click')
			aboutModal.style.display = "none";
		}
		setFocus("textInputBox");
	}

	// Finally, set display active
	endScrn.style.display = 'block';
	showIntroPage = 1;
	setFocus("textInputBox");
}

function setFocus(elId){
	//console.log('focus elId:', elId)
	document.getElementById(elId).focus();	
}

function restart(){
	var endScrn = document.getElementById('endScreen');
	var nameInput = document.getElementById("textInputBox");
	
	var x = nameInput.value;
    document.getElementById("textInputBox").innerHTML = x;
	
	console.log('restart button pushed: ', nameInput.value)
	console.log('currPlayerIndex restart: ', currPlayerIndex)
	
	// Update name with new value
	totalPlayers.score[currPlayerIndex][4] = nameInput.value;
	
	sock.emit('updatePlayerName',[currPlayerIndex,nameInput.value])
	// set display inactive
	endScrn.style.display = 'none';
	showIntroPage = 0;
}

function mainDraw(){
	
	// Have camera follow bot
	var cameraFollowBot = 1;
	
	if (typeof totalPlayers === 'undefined') {
		// variable is undefined, do nothing, default viewMatrix will be drawn		
	} else{
		// Once players have connected
		if(cameraFollowBot){
			currPlayerIndex = 1;
		}
		var xOffset = totalPlayers.blockPos[currPlayerIndex].x;
		var yOffset = totalPlayers.blockPos[currPlayerIndex].y;
		
		var yViewWin = glowCanvas[0].height/blockSize;
		var xViewWin = glowCanvas[0].width/blockSize;
		
		if(xViewWin > windowXSize/blockSize){
			xViewWin = windowXSize/blockSize;
		}
		if(yViewWin > windowYSize/blockSize){
			yViewWin = windowYSize/blockSize;
		}
		
		var bmY = Math.floor(yOffset - 1/2*yViewWin);
		var bmX = Math.floor(xOffset - 1/2*xViewWin);

		var drawWallY = null;
		var drawWallX = null;		
		
		if (bmY < 0){
			bmY = 0;
			drawWallY = 0+5;
		}
		if (yOffset > windowYSize/blockSize - 1/2*yViewWin){
			bmY = windowYSize/blockSize - yViewWin;
			drawWallY = yViewWin*blockSize-5;
		}

		if (bmX < 0){
			bmX = 0;
			drawWallX = 0+5;
		}

		if (xOffset > windowXSize/blockSize - 1/2*xViewWin){
			bmX = windowXSize/blockSize - xViewWin;	
			drawWallX = xViewWin*blockSize-5;
		}		

			// Create local view window matrix, subset of main blockMatrix
		for( var y = 0; y < yViewWin; y++ ){
			var locY = bmY+y;
			var locX = bmX+xViewWin+1;
			locY = Math.floor(locY);
			locX = Math.floor(locX);
			// Populate local view matrix from main block matrix
			viewMatrix[y] = blockMatrix[locY].slice(bmX,locX);
		}

		//var locPrevViewWindow = viewMatrix;
	}
	
	// Draw wall, if close to it
	drawWall(drawWallX,drawWallY);
	
	// Draw power ups layer
	drawPowerUps(bmX,bmY,xViewWin,yViewWin);
	
	// Draw local view window matrix
	matrixDraw(viewMatrix,bmX,bmY);		
	
	// Draw leaderboard
	drawLeaderboard();
}

function matrixDraw(locBlockMatrix,bmX,bmY) {
	
	//var colorCounts = {};
	//Loop over game board and draw filled blocks
	xSize = blockSize * 1;
	ySize = blockSize * 1;
	
	var yLim;
	var yLim2;	
	var xLim;
	var xLim2;
	
	// Make dict
	var locPlayerPaths = {0: []};
	var locPlayerPathsX = {0: []};
	var locPlayerPathsY = {0: []};
	
	if (typeof totalPlayers === 'undefined') {
		return;
	}
	
	for (var z=0;z<totalPlayers.color.length;z++){
		locPlayerPaths[totalPlayers.color[z]] = [];	
		locPlayerPathsX[totalPlayers.color[z]] = [];
		locPlayerPathsY[totalPlayers.color[z]] = [];
	}
	//console.log('glowCanvas[0].height/blockSize: ',glowCanvas[0].height/blockSize)
	//console.log('glowCanvas[0].width/blockSize: ',glowCanvas[0].width/blockSize)
	// Create list of x and y lines to draw
	for( var y = 0; y <= glowCanvas[0].height/blockSize; y++ ){
		for(var x = 0; x <= glowCanvas[0].width/blockSize; x++){				
			if(locBlockMatrix[y][x] != 0){
				
				//console.log('y is diff: ',y)
				//console.log('x is diff: ',x)
				
				var firstX = x;
				var lenX = 0;
				var firstY = y;
				var lenY = 0;
				
				// Check if next X is part of longer line

				var leftX = x-1;
				if(leftX < 0){
					leftX = 0;
				}
				for(var xx=x;xx <= glowCanvas[0].width/blockSize; xx++){
					if((locBlockMatrix[y][xx] == locBlockMatrix[y][x])&&((locBlockMatrix[y][leftX] != locBlockMatrix[y][x]) || (leftX == 0))){
					//if(locBlockMatrix[y][xx] == locBlockMatrix[y][x]){
						lenX++;
					}else{
						break; // Once a gap is found, break, line segment has ended
					}
				}
				//console.log('locBlockMatrix: ',locBlockMatrix)
				if(lenX > 1){
					if (typeof locPlayerPathsX[locBlockMatrix[y][x]][y] === 'undefined') {
						locPlayerPathsX[locBlockMatrix[y][x]][y] = [];
					}
					var locArr = [x,lenX];
					locPlayerPathsX[locBlockMatrix[y][x]][y].push(locArr);
					//x = firstX + lenX - 1; // Next loop run will increment by 1 so delete 1
					//console.log('x after line found: ',x)
					//console.log('locPlayerPathsX[locBlockMatrix[y][x]][y][0] after line found: ',locPlayerPathsX[locBlockMatrix[y][x]][y][0])
					//console.log('locPlayerPathsX[locBlockMatrix[y][x]][y][1] after line found: ',locPlayerPathsX[locBlockMatrix[y][x]][y][1])
				}		

				// Check if next Y is part of longer line
				
				var aboveY = y-1;
				if(aboveY < 0){
					aboveY = 0;
				}
				
				for(var yy=y;yy <= glowCanvas[0].height/blockSize; yy++){
					if((locBlockMatrix[yy][x] == locBlockMatrix[y][x])&&((locBlockMatrix[aboveY][x] != locBlockMatrix[y][x]) || (aboveY == 0))){
					//if(locBlockMatrix[yy][x] == locBlockMatrix[y][x]){
						lenY++;
					}else{
						break; // Once a gap is found, break, line segment has ended
					}
				}
				
				if(lenY > 1){
					if (typeof locPlayerPathsY[locBlockMatrix[y][x]][x] === 'undefined') {
						locPlayerPathsY[locBlockMatrix[y][x]][x] = [];
					}
					var locArr = [y,lenY];
					locPlayerPathsY[locBlockMatrix[y][x]][x].push(locArr);
					//y = firstY + lenY - 1; // Next loop run will increment by 1 so delete 1
					//console.log('x after line found: ',x)
					//console.log('locPlayerPathsX[locBlockMatrix[y][x]][y][0] after line found: ',locPlayerPathsX[locBlockMatrix[y][x]][y][0])
					//console.log('locPlayerPathsX[locBlockMatrix[y][x]][y][1] after line found: ',locPlayerPathsX[locBlockMatrix[y][x]][y][1])
				}
				
			} // if color != 0 loop				
		} // x width loop
		
	} // y height loop
	
    //var glowPixelList = [0, 2, -2, 4, -4, 6, -6, 8, -8];	
	var glowPixelList = [];
	var glowLen = 3; // 1 = no glow
	var glowWidth = 3;
	//var glowResetWidth = ((glowLen-1)*2 + 1)*(glowLen-1)*glowWidth;
	
	for(var dd = 0; dd<glowLen;dd++){
		glowPixelList.push(dd*glowWidth);		
	}
	
	for(var cc = glowPixelList.length-1;cc>=0;cc--){ // draw outside glows first
	
		for(var aa=0;aa<totalPlayers.color.length;aa++){
			var rCol = parseInt(totalPlayers.color[aa].substring(1,3),16);
			var gCol = parseInt(totalPlayers.color[aa].substring(3,5),16);
			var bCol = parseInt(totalPlayers.color[aa].substring(5,7),16);
			//console.log('aa: ', aa)
			var pathLens = 0;
			
			//console.log('locPlayerPaths[0]: ',locPlayerPaths[0])			
			//console.log('locPlayerPaths[totalPlayers.color[aa]].length: ',locPlayerPaths[totalPlayers.color[aa]].length)
			
			// Reset background, part of only draw differences
			/*
			ctx.fillStyle = "#5f5d5d";
			for(var ee = 0;ee<locPlayerPaths[0].length;ee++){
				var resetX = locPlayerPaths[0][ee][0];
				var resetY = locPlayerPaths[0][ee][1];				
				//console.log('background reset x', x)
				ctx.fillRect(blockSize * resetX, blockSize * resetY, blockSize, blockSize);	
				pathLens++;
			}
			*/
			
			glowCtx[cc].beginPath();
			//ctx.strokeStyle="rgba(255, 255, " + (20).toString() + ", " + (.1).toString() + ")";
			if(glowPixelList[cc] == 0){
				//glowCtx[cc].strokeStyle=totalPlayers.color[aa];
				glowCtx[cc].strokeStyle="rgba("+rCol.toString()+", "+gCol.toString()+", "+bCol.toString()+", 0.75)";
				glowCtx[cc].lineWidth = (blockSize+glowPixelList[cc]).toString();
				// Simple glow
				glowCtx[cc].shadowColor = totalPlayers.color[aa];
				glowCtx[cc].shadowBlur = totalPlayers.score[aa][0]*0.1;
			}else{
				glowCtx[cc].lineWidth = (blockSize+glowPixelList[cc]).toString();
				//ctx.strokeStyle="rgba(250, 150, 70, " + (1/Math.abs(glowPixelList[cc])).toString() + ")";
				var glowStr = (1/glowPixelList[cc]).toFixed(2);
				//console.log('glowStr: ',glowStr)
				//glowCtx[cc].strokeStyle=totalPlayers.color[aa];
				glowCtx[cc].strokeStyle="rgba("+rCol.toString()+", "+gCol.toString()+", "+bCol.toString()+", " + glowStr + ")";
				//console.log('SPECIAL STROKE STYLE 2: ',ctx.strokeStyle)
			}
			//console.log('ctx.strokeStyle: ',ctx.strokeStyle)
			
			//console.log('locPlayerPathsX[totalPlayers.color[aa]].length: ',locPlayerPathsX[totalPlayers.color[aa]].length)
			
			// Draw x lines as line segments
			
			for(var yy = 0;yy<locPlayerPathsX[totalPlayers.color[aa]].length;yy++){
				//console.log('yy at 741: ',yy)
				if(typeof locPlayerPathsX[totalPlayers.color[aa]][yy] != 'undefined'){
					//console.log('yy at 741: ',yy)
					//console.log('locPlayerPathsX[totalPlayers.color[aa]][yy]: ',locPlayerPathsX[totalPlayers.color[aa]][yy])
					for(xxx = 0;xxx<locPlayerPathsX[totalPlayers.color[aa]][yy].length;xxx++){
						glowCtx[cc].moveTo(locPlayerPathsX[totalPlayers.color[aa]][yy][xxx][0]*blockSize,            yy*blockSize+0.5*blockSize);
						glowCtx[cc].lineTo((locPlayerPathsX[totalPlayers.color[aa]][yy][xxx][0]+locPlayerPathsX[totalPlayers.color[aa]][yy][xxx][1])*blockSize,yy*blockSize+0.5*blockSize);				
				
					}
				}				
			}
			
			// Draw y lines as line segments
			
			for(var yy = 0;yy<locPlayerPathsY[totalPlayers.color[aa]].length;yy++){
				//console.log('yy at 741: ',yy)
				if(typeof locPlayerPathsY[totalPlayers.color[aa]][yy] != 'undefined'){
					//console.log('yy at 793: ',yy)
					//console.log('locPlayerPathsY[totalPlayers.color[aa]][yy]: ',locPlayerPathsY[totalPlayers.color[aa]][yy])
					for(xxx = 0;xxx<locPlayerPathsY[totalPlayers.color[aa]][yy].length;xxx++){
						//ctx.moveTo(locPlayerPathsY[totalPlayers.color[aa]][yy][xxx][0]*blockSize,            yy*blockSize+0.5*blockSize+glowPixelList[cc]);
						//ctx.lineTo((locPlayerPathsY[totalPlayers.color[aa]][yy][xxx][0]+locPlayerPathsY[totalPlayers.color[aa]][yy][xxx][1])*blockSize,yy*blockSize+0.5*blockSize+glowPixelList[cc]);
						glowCtx[cc].moveTo(yy*blockSize+0.5*blockSize,locPlayerPathsY[totalPlayers.color[aa]][yy][xxx][0]*blockSize);
						glowCtx[cc].lineTo(yy*blockSize+0.5*blockSize,(locPlayerPathsY[totalPlayers.color[aa]][yy][xxx][0]+locPlayerPathsY[totalPlayers.color[aa]][yy][xxx][1])*blockSize);
					}
				}				
			}			
			// Draw after constructing lines
			glowCtx[cc].stroke();
			//console.log('pathLens: ',pathLens)	
			//console.log('totalPlayers.blockPos[aa].x: ',totalPlayers.blockPos[aa].x)
			//console.log('totalPlayers.blockPos[aa].y: ',totalPlayers.blockPos[aa].y)
			//console.log('viewport.width: ',viewport.width)
			//console.log('viewport.height: ',viewport.height)
			//console.log('bmX: ',bmX)
			//console.log('bmY: ',bmY)
			
			// Draw faces on each player			
			drawFace(aa,bmX,bmY);			
		} // aa loop, over totalPlayers.color.length
	}
	
}

function drawFace(aa,bmX,bmY){

	if(bmY == windowYSize/blockSize - glowCanvas[0].height/blockSize){
		bmY = Math.floor(bmY);
		//console.log('bmY: ', bmY)
		//console.log("Were at bottom of screen!!")
	}
	// Main face
	faceCtx.beginPath();
	faceCtx.strokeStyle = totalPlayers.color[aa];
	faceCtx.lineWidth=1;
	faceCtx.arc(((totalPlayers.blockPos[aa].x-bmX) * blockSize)+0.5*blockSize+0,((totalPlayers.blockPos[aa].y-bmY) * blockSize)+0.5*blockSize+0,blockSize*0.7,0,2*Math.PI);
	
	// Draw glow to indicate power-up timers
	if(totalPlayers.score[aa][3][1] != null){
		var glowStrength = performance.now()-totalPlayers.score[aa][3][1];
		if((totalPlayers.score[aa][3][0] == 0)||(totalPlayers.score[aa][3][0] == 1)){ // speed power-ups
			var puTimer = 5000;
		}else if(totalPlayers.score[aa][3][0] == 4){ // ignore collisions power-up
			var puTimer = 8000;
		}else{
			throw new ERROR('Power-up has no timer, cant glow!');
		}
		faceCtx.shadowBlur = Math.floor(puTimer/100 - glowStrength/100);
		faceCtx.shadowColor = "#ffffff";
	}	
	
	faceCtx.fillStyle = totalPlayers.color[aa];
	faceCtx.fill();
	faceCtx.stroke();
	// Inner face
	faceCtx.beginPath();
	faceCtx.strokeStyle = ColorLuminance(totalPlayers.color[aa], 0.8);
	faceCtx.lineWidth=1;
	//faceCtx.shadowColor = 0;
	//faceCtx.shadowBlur = 0;
	faceCtx.arc(((totalPlayers.blockPos[aa].x-bmX) * blockSize)+0.5*blockSize+0,((totalPlayers.blockPos[aa].y-bmY) * blockSize)+0.5*blockSize+0,blockSize*0.5,0,2*Math.PI);
	faceCtx.stroke();
	// Inner inner face
	faceCtx.beginPath();
	faceCtx.strokeStyle = ColorLuminance(totalPlayers.color[aa], 0.4);
	faceCtx.lineWidth=1;
	//faceCtx.shadowColor = 0;
	//faceCtx.shadowBlur = 0;
	faceCtx.arc(((totalPlayers.blockPos[aa].x-bmX) * blockSize)+0.5*blockSize+0,((totalPlayers.blockPos[aa].y-bmY) * blockSize)+0.5*blockSize+0,blockSize*0.25,0,2*Math.PI);
	faceCtx.stroke();

	// Draw player name text
	var playerText = "";
	playerText = totalPlayers.score[aa][4];	
	faceCtx.font="17px Georgia";
	faceCtx.strokeStyle = totalPlayers.color[aa];
	faceCtx.shadowBlur = 0;
	faceCtx.shadowColor = 0;
	faceCtx.strokeText(playerText,((totalPlayers.blockPos[aa].x-bmX) * blockSize)+2*blockSize,((totalPlayers.blockPos[aa].y-bmY) * blockSize)+2*blockSize);
}

function drawPowerUps(TLCx,TLCy,xSize,ySize){	
	
	var BRCx = Math.floor(TLCx + xSize);
	var BRCy = Math.floor(TLCy + ySize);
	//console.log('TLCx: ', TLCx)
	//console.log('TLCy: ', TLCy)
	//console.log('BRCx: ', BRCx)
	//console.log('BRCy: ', BRCy)
	
	// handle different types of power ups
	if (typeof totalPlayers === 'undefined') {
		return;
	}
	
	for(var x=0;x<totalPlayers.powerUps.length;x++){
		
		var locXPUPos = totalPlayers.powerUps[x][0];
		var locYPUPos = totalPlayers.powerUps[x][1];
		var drawLocPU = 0;
		
		//console.log('locXPUPos: ', locXPUPos)
		//console.log('locYPUPos: ', locYPUPos)
		// Check if global-pos based power ups are within local view window
		if((locXPUPos > TLCx)&&(locXPUPos < BRCx)){			
			if((locYPUPos > TLCy)&&(locYPUPos < BRCy)){
				drawLocPU = 1;
				locXPUPos = (locXPUPos - TLCx)*blockSize;
				locYPUPos = (locYPUPos - TLCy)*blockSize;
				//console.log('drawLocPU: ', drawLocPU)
			}
		}		
		
		if(drawLocPU){
			powerupCtx.drawImage(puImages[totalPlayers.powerUps[x][2]],locXPUPos,locYPUPos,blockSize*3,blockSize*3);
		}//	if drawLocPU	
	}
}

function clearBoardOfPlayer(colStr){
	//Loop over game board and clear blocks of the input color string
	//xSize = blockSize * 1;
	//ySize = blockSize * 1;
	console.log("colStr: ",colStr)
	for( var y = 0; y <= windowYSize/blockSize; y++ ){
		for(var x = 0; x <= windowXSize/blockSize; x++){
			if(blockMatrix[y][x] == colStr){
				// Reset blockMatrix to default
				blockMatrix[y][x] = 0;
				// Repaint blocks to background color
				//ctx.fillStyle = "#5f5d5d";
				//ctx.fillRect(blockSize * x, blockSize * y, xSize, ySize);
			}
		}
	}	
}

// Clear whole game board
function clearGameBoard(){
	//Loop over game board and clear blocks of the input color string
	//Loop over game board and clear blocks of the input color string
	xSize = blockSize * 1;
	ySize = blockSize * 1;
	for( var y = 0; y <= windowYSize/blockSize; y++ ){
		for(var x = 0; x <= windowXSize/blockSize; x++){
			if(blockMatrix[y][x] != 0){
				// Reset blockMatrix to default
				blockMatrix[y][x] = 0;
				// Repaint blocks to background color
				//ctx.fillStyle = "#5f5d5d";
				//ctx.fillRect(blockSize * x, blockSize * y, xSize, ySize);
			}
		}
	}	
}

function updateInputs(){
	
	var tronMovement = 1;
	
	if(locMovementDir == 'left' || locMovementDir == 'right'){
		if(keyboard.pressed('up')){
			sock.emit('onTurn','up');
			locMovementDir = 'up';
		}else if(keyboard.pressed('down')){
			sock.emit('onTurn','down');
			locMovementDir = 'down';
		}else{
			if (tronMovement){
				sock.emit('onTurn',locMovementDir); // if no new input, keep moving in direction of previous input
			}
		}
	}
	
	if(locMovementDir == 'down' || locMovementDir == 'up'){
		if(keyboard.pressed('left')){
			sock.emit('onTurn','left');
			locMovementDir = 'left';
		}else if(keyboard.pressed('right')){
			sock.emit('onTurn','right');
			locMovementDir = 'right';
		}else{
			if (tronMovement){
				sock.emit('onTurn',locMovementDir); // if no new input, keep moving in direction of previous input
			}
		}		
	}
	
	// To allow debug when tronMovement is off
	if(tronMovement == 0){
		if(locMovementDir == 'left'){
			if(keyboard.pressed('left')){
				sock.emit('onTurn','left');
				locMovementDir = 'left';
			}
		}
		if(locMovementDir == 'right'){
			if(keyboard.pressed('right')){
				sock.emit('onTurn','right');
				locMovementDir = 'right';
			}
		}
		if(locMovementDir == 'down'){
			if(keyboard.pressed('down')){
				sock.emit('onTurn','down');
				locMovementDir = 'down';
			}
		}
		if(locMovementDir == 'up'){
			if(keyboard.pressed('up')){
				sock.emit('onTurn','up');
				locMovementDir = 'up';
			}
		}
	}
	
}

function drawWall(drawWallX,drawWallY){
	
	if(drawWallX != null){
		wallCtx.beginPath();
		wallCtx.moveTo(drawWallX, 0);
		wallCtx.lineTo(drawWallX, glowCanvas[0].height);
		wallCtx.lineWidth = "10";
		wallCtx.strokeStyle = "white";
		wallCtx.shadowColor =  "white";
		wallCtx.shadowBlur = 30;
		wallCtx.stroke();		
	}
	
	if(drawWallY != null){
		wallCtx.beginPath();
		wallCtx.moveTo(0, drawWallY);
		wallCtx.lineTo(glowCanvas[0].width,drawWallY);
		wallCtx.lineWidth = "10";
		wallCtx.strokeStyle = "white";
		wallCtx.shadowColor = "white";
		wallCtx.shadowBlur = 30;
		wallCtx.stroke();		
	}	
}

function drawGrid(){
	
	//var bw = viewport.width;
	//var bh = viewport.height;
	//var p = 0;
	//var s = blockSize*7;
	gridCtx.beginPath();
	
	for (var x = 0; x <= glowCanvas[0].width; x += blockSize*6) {
		gridCtx.moveTo(x, 0);
		gridCtx.lineTo(x, glowCanvas[0].height);
	}

	for (var x = 0; x <= glowCanvas[0].height; x += blockSize*6) {
		gridCtx.moveTo(0, x);
		gridCtx.lineTo(glowCanvas[0].width, x);
	}

	gridCtx.lineWidth = "1";
	gridCtx.strokeStyle = "grey";
	gridCtx.stroke();
	
}

function drawLeaderboard() {
	
	var list=document.getElementById('myTopPlayers');
	var header = document.createElement('li');
	//var colorCounts;
	var lenColListNums = [];
	var locLCLN = [];
	var leaderBoardDispCount = 2;
	
	// Set leaderboard to top left corner
	//console.log('(viewport.width*0.1).toString()', Math.floor((viewport.width*0.1)).toString())
	var paddingStr = "42px 0px 0px " + Math.floor((glowCanvas[0].width-175)).toString()+"px"
	document.getElementById('myTopPlayers').style.padding = paddingStr;
	
	// Clear old list
	list.innerHTML = "";
	header.innerHTML = "Score : Kills : Deaths";
	header.style.color = "#ffffff";
	header.style.fontSize = "large";
	list.appendChild(header);
	
	//colorCounts = matrixCount(blockMatrix);
	//console.log('colorCounts: ',colorCounts)
	//var trailLenList = [];
	if (typeof totalPlayers === 'undefined') {
		
	}else{
		for(var x=0;x<totalPlayers.color.length;x++){
			//console.log('x at 487: ',x)
			//console.log('totalPlayers.color[x]: ',totalPlayers.color[x])
			//console.log('colorCounts[totalPlayers.color[x]]: ',colorCounts[totalPlayers.color[x]])
			//var lenColList = [colorCounts[totalPlayers.color[x]], x];
			//totalPlayers.score[x][0] = colorCounts[totalPlayers.color[x]];
			//trailLenList.push(lenColList);
			lenColListNums.push(totalPlayers.score[x][0]);
			locLCLN.push(totalPlayers.score[x][0]);
			locLCLN.sort(function(a, b){return b-a});
			for(var z=locLCLN.length-1;z>=leaderBoardDispCount;z--){
				locLCLN.splice(z,1); // Remove extras				
			}		
		}
	}
	//console.log('lenColListNums at 495: ',lenColListNums)
	// Order most to least
	//locLCLN.sort(function(a, b){return b-a});;
	var leaderLocCol = [];
	var locScoreList = [];
	var locNameList = [];
	//console.log('lenColListNums at 500: ',lenColListNums)
	//console.log('trailLenList: ',trailLenList)
	//console.log('lenColListNums: ',lenColListNums)
	//console.log('locLCLN: ',locLCLN)
	
	for(var x=0;x<locLCLN.length;x++){
		var colIndex = lenColListNums.indexOf(locLCLN[x]);
		//console.log('colIndex: ',colIndex)
		//console.log('totalPlayers.score[colIndex]: ',totalPlayers.score[colIndex])
		//console.log('totalPlayers.color[trailLenList[colIndex][1]]: ',totalPlayers.color[trailLenList[colIndex][1]])
		//leaderLocCol.push(totalPlayers.color[trailLenList[colIndex][1]]);
		//locScoreList.push(totalPlayers.score[trailLenList[colIndex][1]]);
		leaderLocCol.push(totalPlayers.color[colIndex]);
		locScoreList.push(totalPlayers.score[colIndex].slice(0,3));
		locNameList.push(totalPlayers.score[colIndex][4]);
		//console.log('trailLenList[colIndex][1]: ',totalPlayers.color[trailLenList[colIndex][1]])	
	}	
	//console.log('leaderLocCol: ',leaderLocCol)
	for(var x=0;x<locLCLN.length;x++){
		
		var item = document.createElement('li');		
		var finalLBRow = locNameList[x] + ': ' + locScoreList[x];		
		
		item.innerHTML = finalLBRow;
		item.style.color = leaderLocCol[x];
		item.style.fontSize = "large";
        // Set its contents:
        //item.appendChild(document.createTextNode(locLCLN[x]));

        // Add it to the list:
        list.appendChild(item);	
	}	
}

function checkPlayerCollisions(updatedPos){	
	var colRes = 0;
	if (typeof blockMatrix[updatedPos.y][updatedPos.x] === 'undefined') {
		console.log(updatedPos);
		console.log(blockMatrix);
	} else{
		// Once players have connected
	}
	if(blockMatrix[updatedPos.y][updatedPos.x] != 0){
			colRes = [1, blockMatrix[updatedPos.y][updatedPos.x]];
	}
	
	return colRes;
}

function checkPowerUpCollisions(updatedPos){	
	var puColl = null;	
	
	for(var x=0;x<totalPlayers.powerUps.length;x++){
		//console.log('updatedPos.y: ',updatedPos.y)
		//console.log('updatedPos.x: ',updatedPos.x)
		//console.log('totalPlayers.powerUps[x][1]: ',totalPlayers.powerUps[x][1])
		//console.log('totalPlayers.powerUps[x][0]: ',totalPlayers.powerUps[x][0])
		if((updatedPos.y >= totalPlayers.powerUps[x][1])&&(updatedPos.y <= totalPlayers.powerUps[x][1]+2)){
			if((updatedPos.x >= totalPlayers.powerUps[x][0])&&(updatedPos.x <= totalPlayers.powerUps[x][0]+2)){
				// New pos is on a power up			
				puColl = totalPlayers.powerUps[x][2];
				console.log('puColl DETECTED: ',puColl)
			}			
		}
	}
	
	return puColl;
}

function spawnNewPowerUp(updatedPos,puColl,x,pIndex){

    // If curr player isnt the one who hit power-up, let that player spawn new power up, you'll get an emit with new info
	if(x != pIndex){
		return;
	}
	
	// Find which power-up was activated
	var puIndex = null;
	
	for(var x=0;x<totalPlayers.powerUps.length;x++){
		if((updatedPos.y >= totalPlayers.powerUps[x][1])&&(updatedPos.y <= totalPlayers.powerUps[x][1]+2)){
			if((updatedPos.x >= totalPlayers.powerUps[x][0])&&(updatedPos.x <= totalPlayers.powerUps[x][0]+2)&&(totalPlayers.powerUps[x][2] == puColl)){
		//if((updatedPos.y == totalPlayers.powerUps[x][1])&&(updatedPos.x == totalPlayers.powerUps[x][0])&&(totalPlayers.powerUps[x][2] == puColl)){
				puIndex = x;
				break;
			}
		}			
	}

	console.log('RESET POWERUP: ',puIndex)	
	//var randXPos = Math.floor(Math.random()*windowXSize/blockSize);
	//var randYPos = Math.floor(Math.random()*windowYSize/blockSize);
	
	var randXPos = updatedPos.x + 10;
	var randYPos = updatedPos.y + 10;
	
	// Speed up/slow down are broken, so only spawn power ups 2-4
	var powerUpType = Math.floor(Math.random()*3)+2;
	//console.log('powerUpType in spawnNewPowerUp: ', powerUpType);
	//var powerUpType = Math.floor(Math.random()*5); // allow all power ups 0-4
	var newRandPowerUp = [randXPos,randYPos,powerUpType];
	
	totalPlayers.powerUps[puIndex] = newRandPowerUp;
	
	var updateForOthers = [puIndex,newRandPowerUp];
	sock.emit('newPowerUp', updateForOthers)
	
}

// If other player hit power-up, they will spawn a new one and emit info to other players, they update globals here
function onSyncNewPowerUp(updateForOthers){
	
	totalPlayers.powerUps[updateForOthers[0]] = updateForOthers[1];
	
}

function onSyncPlayerNames(updateNames){
	
	totalPlayers.score[updateNames[0]][4] = updateNames[1];
	
}

function matrixCount(locBlockMatrix) {
	
	var colorCounts=0;
	//console.log('locBlockMatrix: ',locBlockMatrix)	
	//console.log('locBlockMatrix.length: ',locBlockMatrix.length)
	//Loop over game board and count filled blocks
	xSize = blockSize * 1;
	ySize = blockSize * 1;
	for( var y = 0; y < locBlockMatrix.length; y++ ){
		//console.log('y at 780: ',y)	
		//console.log('locBlockMatrix[y]: ',locBlockMatrix[y])
		//console.log('locBlockMatrix[y].length: ',locBlockMatrix[y].length)		
		for(var x = 0; x < locBlockMatrix[y].length; x++){
			if(locBlockMatrix[y][x] != 0){
				//console.log('y at 828: ',y)
				//console.log('x at 829: ',x)
				colorCounts++;	
			}
		}
	}
	
	return colorCounts;
}

function checkWallCollisions(updatedPos){
	
	var wallDEBUG = 0;
	var wallCollX = false;
	var wallCollY = false;
	
	var yWallLimit = windowYSize/blockSize - 1;
	var xWallLimit = windowXSize/blockSize - 1;
	if(updatedPos.y < 0){
		if (wallDEBUG){ console.log('updatedPos.y reset below 0: ',updatedPos.y)};
		updatedPos.y = 0;
		wallCollY = true;		
	}else if(updatedPos.y > yWallLimit){
		if (wallDEBUG){ console.log('updatedPos.y reset above yWallLimit: ',updatedPos.y)};
		updatedPos.y = yWallLimit;
		wallCollY = true;
	}
	
	if(updatedPos.x < 0){
		if (wallDEBUG){ console.log('updatedPos.x reset below 0: ',updatedPos.x)};
		updatedPos.x = 0;
		wallCollX = true;
	}else if(updatedPos.x > xWallLimit){
		if (wallDEBUG){ console.log('updatedPos.x reset above xWallLimit: ',updatedPos.x)};
		updatedPos.x = xWallLimit;
		wallCollX = true;
	}
	
	return [updatedPos, wallCollX, wallCollY];	
}

function getBotNewPos(updatedPos){
	var finalMoveList = [];
	var costList = [];
	var botIndex = 1;
	var costDict = {0:0,1:0,2:0,3:0}
	costDict = evalMoves(totalPlayers.blockPos[botIndex],costDict);
	//console.log('costDict: ', costDict);
	for(key in costDict){
	    costList.push(costDict[key]);
	}
	var posMoveList = [];
	var minCost = arrayMin(costList);
	
	for(var x = 0;x<costList.length;x++){
		if (costList[x] == minCost){
			posMoveList.push(x);	
		}			
	}
	//console.log('costList: ', costList);
	//console.log('posMoveList.length: ', posMoveList.length);
	if (posMoveList.length > 1){
		var randPosMoveList = Math.floor(Math.random()*posMoveList.length);
		//console.log('randPosMoveList: ', randPosMoveList);
		var sCase = posMoveList[randPosMoveList];
	}
	else{
		var sCase = posMoveList[0];
	}
	//console.log('sCase: ', sCase);
	//console.log('posMoveList: ', posMoveList);
	switch (sCase){
			case 0:
				var finalBotPos = {x: 0, y: -1};
			break;
			case 1:
				var finalBotPos = {x: 0, y: 1};
			break;
			case 2:
				var finalBotPos = {x: -1, y: 0};
			break;
			case 3:
				var finalBotPos = {x: 1, y: 0};
			break;
		}
	return finalBotPos; // needs to be final final bot pos
}

function arrayMin(arr) {
  var len = arr.length, min = Infinity;
  while (len--) {
    if (arr[len] < min) {
      min = arr[len];
    }
  }
  return min;
};

function evalMoves(curPos,costDict){
	
	var botIndex = 1;
	var maxCost = 999;
	var loopCount = 1;
	var finalMoveList = [];
	
	// Pure random move logic
	/*
	var randMov = Math.floor(Math.random()*4);
	for (var z=0;z<4;z++){
		if(z != randMov){
			costDict[z] += maxCost;
		}
	}
	*/	
	for (var z=0;z<4;z++){
		switch (z){
			case 0:
				var newBotPos = {x: 0, y: -1};
			break;
			case 1:
				var newBotPos = {x: 0, y: 1};
			break;
			case 2:
				var newBotPos = {x: -1, y: 0};
			break;
			case 3:
				var newBotPos = {x: 1, y: 0};
			break;
		}
		//console.log('newBotPos in evalMoves: ',newBotPos)
		//console.log('curPos in evalMoves: ',curPos)
		// Check if move will cause death
		var eUpdatedPos = calcNewBlockPos(newBotPos,curPos); 
		
		//console.log('eUpdatedPos in evalMoves: ',eUpdatedPos)
		//Check for collision with wall
		var postColl;
		postColl = checkWallCollisions(eUpdatedPos);
		eUpdatedPos = postColl[0];
		var wallCollOccur = (postColl[botIndex] || postColl[2]);
		//console.log('BOT COLLISION DETECTED with wall: ', wallCollOccur)
		
		// Check for collision with any player
		//var collRes = [];
		var collRes = checkPlayerCollisions(eUpdatedPos);
		//console.log('BOT COLLISION DETECTED with player: ', collRes)
		
		if((wallCollOccur || collRes[0])){
			costDict[z] += maxCost/(Math.pow(4,0));
			continue; // If move at first step look ahead causes death, dont bother calculating rest of costs
		}
		
		
		for (var zz=0;zz<4;zz++){
			switch (zz){
			case 0:
				var newBotPos = {x: 0, y: -1};
			break;
			case 1:
				var newBotPos = {x: 0, y: 1};
			break;
			case 2:
				var newBotPos = {x: -1, y: 0};
			break;
			case 3:
				var newBotPos = {x: 1, y: 0};
			break;
			}
			
			var eUpdatedPos2 = calcNewBlockPos(newBotPos,eUpdatedPos); 
			//console.log('eUpdatedPos2 in evalMoves: ',eUpdatedPos2)
			//Check for collision with wall
			var postColl;
			postColl = checkWallCollisions(eUpdatedPos2);
			eUpdatedPos2 = postColl[0];
			var wallCollOccur = (postColl[botIndex] || postColl[2]);
			//console.log('BOT COLLISION DETECTED with wall 2: ', wallCollOccur)
			
			// Check for collision with any player
			//var collRes = [];
			var collRes = checkPlayerCollisions(eUpdatedPos2);
			//console.log('BOT COLLISION DETECTED with player 2: ', collRes)
			
			if((wallCollOccur || collRes[0])){
				costDict[z] += maxCost/(Math.pow(4,1));
				continue; // If move at first step look ahead causes death, dont bother calculating rest of costs
			}
			
			for (var zzz=0;zzz<4;zzz++){
				switch (zzz){
					case 0:
						var newBotPos = {x: 0, y: -1};
					break;
					case 1:
						var newBotPos = {x: 0, y: 1};
					break;
					case 2:
						var newBotPos = {x: -1, y: 0};
					break;
					case 3:
						var newBotPos = {x: 1, y: 0};
					break;
					}
				
				var eUpdatedPos3 = calcNewBlockPos(newBotPos,eUpdatedPos2); 
				//console.log('eUpdatedPos3 in evalMoves: ',eUpdatedPos3)
				//Check for collision with wall
				var postColl;
				postColl = checkWallCollisions(eUpdatedPos3);
				eUpdatedPos3 = postColl[0];
				var wallCollOccur = (postColl[botIndex] || postColl[2]);
				//console.log('BOT COLLISION DETECTED with wall 2: ', wallCollOccur)
				
				// Check for collision with any player
				//var collRes = [];
				var collRes = checkPlayerCollisions(eUpdatedPos3);
				//console.log('BOT COLLISION DETECTED with player 2: ', collRes)
				
				if((wallCollOccur || collRes[0])){
					costDict[z] += maxCost/(Math.pow(4,2));
					continue;
				}
				
				for (var zzzz=0;zzzz<4;zzzz++){
					switch (zzzz){
						case 0:
							var newBotPos = {x: 0, y: -1};
						break;
						case 1:
							var newBotPos = {x: 0, y: 1};
						break;
						case 2:
							var newBotPos = {x: -1, y: 0};
						break;
						case 3:
							var newBotPos = {x: 1, y: 0};
						break;
						}
					
					var eUpdatedPos4 = calcNewBlockPos(newBotPos,eUpdatedPos3); 
					//console.log('eUpdatedPos4 in evalMoves: ',eUpdatedPos4)
					//Check for collision with wall
					var postColl;
					postColl = checkWallCollisions(eUpdatedPos4);
					eUpdatedPos4 = postColl[0];
					var wallCollOccur = (postColl[botIndex] || postColl[2]);
					//console.log('BOT COLLISION DETECTED with wall 2: ', wallCollOccur)
					
					// Check for collision with any player
					//var collRes = [];
					var collRes = checkPlayerCollisions(eUpdatedPos4);
					//console.log('BOT COLLISION DETECTED with player 2: ', collRes)
					
					if((wallCollOccur || collRes[0])){
						costDict[z] += maxCost/(Math.pow(4,3));
						continue;
					}
					
					for (var zzzzz=0;zzzzz<4;zzzzz++){
						switch (zzzzz){
							case 0:
								var newBotPos = {x: 0, y: -1};
							break;
							case 1:
								var newBotPos = {x: 0, y: 1};
							break;
							case 2:
								var newBotPos = {x: -1, y: 0};
							break;
							case 3:
								var newBotPos = {x: 1, y: 0};
							break;
							}
						
						var eUpdatedPos5 = calcNewBlockPos(newBotPos,eUpdatedPos4); 
						//console.log('eUpdatedPos5 in evalMoves: ',eUpdatedPos5)
						//Check for collision with wall
						var postColl;
						postColl = checkWallCollisions(eUpdatedPos5);
						eUpdatedPos5 = postColl[0];
						var wallCollOccur = (postColl[botIndex] || postColl[2]);
						//console.log('BOT COLLISION DETECTED with wall 2: ', wallCollOccur)
						
						// Check for collision with any player
						//var collRes = [];
						var collRes = checkPlayerCollisions(eUpdatedPos5);
						//console.log('BOT COLLISION DETECTED with player 2: ', collRes)
						
						if((wallCollOccur || collRes[0])){
							costDict[z] += maxCost/(Math.pow(4,4));
							continue;
						}
					
					} // zzzzz loop
				
				} // zzzz loop
			
			} // zzz loop
			
		} // zz loop 
	}// z loop 
	//console.log("costDict: ", costDict);
	return costDict;
}

function drawHundredLines(yOffset) {
	
	ctx.beginPath();
	//ctx.strokeStyle="rgba(255, 255, " + (20).toString() + ", " + (.1).toString() + ")";

	ctx.strokeStyle="#ff0000";
	ctx.lineWidth = blockSize.toString();
	// Simple glow
	//ctx.shadowColor = "#ff0000";
	//ctx.shadowBlur = 5;
	
	for(var x=1;x<150;x++){
		ctx.moveTo((x-1)*blockSize*0.5, 40);
		ctx.lineTo(x*blockSize*0.5, 40 );
	}		
	// Draw after constructing lines
	ctx.stroke();				
}

function drawOneLine(yOffset) {
	
	ctx.beginPath();
	//ctx.strokeStyle="rgba(255, 255, " + (20).toString() + ", " + (.1).toString() + ")";

	ctx.strokeStyle="#00ff00";
	ctx.lineWidth = blockSize.toString();
	// Simple glow
	//ctx.shadowColor = "#00ff00";
	//ctx.shadowBlur = 5;
	

	//ctx.moveTo(yOffset*blockSize, 50*blockSize);
	//ctx.lineTo(yOffset*blockSize, 100*blockSize);
	ctx.moveTo(10, 10);
	ctx.lineTo(1500, 10);
	
	// Draw after constructing lines
	ctx.stroke();
	
}

function ColorLuminance(hex, lum) {

	// validate hex string
	hex = String(hex).replace(/[^0-9a-f]/gi, '');
	if (hex.length < 6) {
		hex = hex[0]+hex[0]+hex[1]+hex[1]+hex[2]+hex[2];
	}
	lum = lum || 0;

	// convert to decimal and change luminosity
	var rgb = "#", c, i;
	for (i = 0; i < 3; i++) {
		c = parseInt(hex.substr(i*2,2), 16);
		c = Math.round(Math.min(Math.max(0, c + (c * lum)), 255)).toString(16);
		rgb += ("00"+c).substr(c.length);
	}

	return rgb;
}
