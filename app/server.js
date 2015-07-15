var http = require( 'http' );
var fs = require( 'fs' );
var path = require( 'path' );
var url = require( 'url' );
var routes = require( './routes.js' );
var io = require("socket.io")(http);

var port = 8000;
var serverUrl = "localhost";
var counter = 0;

var server = http.createServer( function( request, response ) {

	//console log the requests been made 
	counter++;
	console.log( "Request: " + request.url );

	//variables representing various sections of the url
	var filename = request.url || "index.html";
	var extension = path.extname(filename);
	var localPath = __dirname;
	var search = url.parse( request.url ).search;
	var pathname = url.parse( request.url ).pathname;

	//various types of files
	var type = {
		'.html' : 'text/html, application/xhtml+xml',
		'.css' : 'text/css',
		'.js' : 'application/javascript',
		'.txt' : 'text/plain',
		'.png' : 'image/png',
		'.svg' : 'image/svg+xml'
	}
	var validExt = type[extension];

//---------------------------- router -------------------------------

	//visualisation page
	if( pathname.indexOf( "visual.html" ) !=  -1 ) {
		//go to specified page
		if( validExt ) {
			localPath += filename;
		}
		//go to home page
		else {
			localPath += "/routes/visual.html";
		}

		//get files needed for this request
		fs.exists( localPath, function( exists ) {
			if( exists ) {
				console.log( 'Found file at: ' + localPath );
				getFile( localPath, response, validExt );
			}
			else {
				console.log( 'File not found: ' + localPath );
				response.writeHead( 404 );
				response.end();
			}
		});
	}
	//go to the home page
	else {
		//go to specified page
		if( validExt ) {
			localPath += filename;
		}
		//go to home page
		else {
			localPath += "/routes/index.html";
		}

		//get files needed for this request
		fs.exists( localPath, function( exists ) {
			if( exists ) {
				console.log( 'Found file at: ' + localPath );
				getFile( localPath, response, validExt );
			}
			else {
				console.log( 'File not found: ' + localPath );
				response.writeHead( 404 );
				response.end();
			}
		});
	}
	
});

//read a file and display its contents
function getFile( localPath, response, type ) {
	fs.readFile( localPath, function( error, contents ) {

		if( !error ) {
			response.writeHead( 200, { 'Content-Type': type } );
			response.write( contents );
			response.end();
		}
		else {
			response.writeHead( 500 );
			console.log( error );
			response.end();
		}
			
	});
}

console.log('Starting web server at ' + serverUrl + ':' + port );
server.listen( port, serverUrl );