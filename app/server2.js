var express = require("express");
var app = express();
var server = require("http").createServer(app);
var io = require("socket.io")(server);

app.use( express.static( __dirname + "/" ) );

//home page
app.get("/", function( request, response, next ) {
	response.sendFile( __dirname + "/routes/index.html" );
});

//visualisation page
app.get("/visual.html", function( request, response, next ) {
	response.sendFile( __dirname + "/routes/visual.html" );
});

//server side calculations
io.on("connection", function( socket ) {
	//initialise clusters and cluster references (initClusters)
	socket.on("init", function() {
		var clusRef = new Object(); //<-- references the parents of a cluster
		var clusters = [];
		var parents = [];
		for( var i = 1; i < 501; i++ ) { 
			clusters.push( i.toString() );
			clusRef[i.toString()] = parents;
		}

		//prepare variables to be sent to client
		var object = { "clusters": clusters, "clusRef": clusRef };
		io.emit( "init", object ); //<-- send object to client
	});

	//build a similarity table with the one pattern big clusters (buildSimTable)
	socket.on("build", function( patterns ) {
		var simTable = new Object(); //<-- the Jaccard similarity between two patterns
		var priorityQueue = []; //<-- orders patterns/clusters by similarity

		//loop through patterns and compare them against one another
		for( var i = 0; i < 500; i++ ) { 
			for( var j = i; j < 500; j++ ) {
				var key = (i + 1).toString() + (j + 1).toString();
				if( j === i ) { 
					simTable[key] = 0;
				}
				else {
					var sim = similarity( patterns[i], patterns[j] );
					simTable[key] = sim;
				}
				priorityQueue.push( key );	
			}
		}

		//prepare variables to be sent to client
		var object = { "simTable": simTable, "priorityQueue": priorityQueue };
		io.emit( "build", object ); //<-- send object to client
	});
});

function similarity( p1, p2 ) {
	var matchEnt = 0; //<-- intersection
	var difEnt = 0; //<-- union

	for( var i = 0; i < p1.length; i++ ) {
		if( p1[i] === 1 && p2[i] === 1 ) {
			matchEnt++;
			difEnt--;
		}
		if( p1[i] === 1 ) {
			difEnt++;
		}
		if( p2[i] === 1 ) {
			difEnt++;
		}
	}

	var similarity = matchEnt / difEnt;
	return similarity;
}

server.listen( 8000, function() {
	console.log("Listening on port: 8000");
});