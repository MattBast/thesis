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
	//initialise clusters and cluster references
	socket.on("init", function() {
		var clusRef = new Object(); //<-- references the parents of a cluster
		var clusters = [];
		var parents = [];
		for( var i = 1; i < 501; i++ ) { 
			clusters.push( i.toString() );
			clusRef[i.toString()] = parents;
		}
		var object = { "clusters": clusters, "clusRef": clusRef };
		console.log( "Finished initial cluster" );
		io.emit("init", object );
	});


});

server.listen( 8000, function() {
	console.log("Listening on port: 8000");
});