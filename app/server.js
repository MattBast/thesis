var express = require("express");
var app = express();
var server = require("http").createServer(app);
var io = require("socket.io")(server);
var fs = require("fs");
var path = require("path");
var url = require("url");

//the variables used during the clustering process
var patterns; //<-- the patterns and references to the entities they contain
var clusRef; //<-- references the parents of a cluster
var simTable; //<-- the Jaccard similarity between two patterns
var priorityQueue; //<-- orders patterns/clusters by similarity
var level; //<-- each element represents a level in the hierarchical clustering

app.use( express.static( __dirname + "/" ) );

//home page
app.get("/", function( request, response, next ) {
	response.sendFile( __dirname + "/routes/index.html" );
});

//visualisation page
app.get("/visual.html", function( request, response, next ) {
	response.sendFile( __dirname + "/routes/visual.html" );
});

//download saved file
app.get("/download", function( request, response, next ) {
	/* 
		Code based on example from:
		http://code.runnable.com/UTlPPF-f2W1TAAEW/download-files-with-express-for-node-js
	*/
	//the search queury tells the server what the saved file is called
	var search = url.parse( request.url ).search;
	var parsedSearch = url.parse( search, true ).query;
	var path = __dirname + "/" + parsedSearch.file + ".json";
	console.log( path );
	response.download( path );
});

//server side calculations
io.on("connection", function( socket ) {

	//the initial number of clusters before any are clustered together
	var startProgress;

	//initialise clusters and cluster references (initClusters)
	socket.on("init", function() {
		var clusRef = new Object(); //<-- references the parents of a cluster
		var clusters = [];
		var parents = [];
		for( var i = 1; i < 501; i++ ) { 
			clusters.push( i.toString() );
			clusRef[i.toString()] = parents;
		}

		startProgress = clusters.length;

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
				var key = (i + 1).toString() + "+" + (j + 1).toString();
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

	socket.on("cluster", function( variables ) {
		//put values brought over from client into server versions
		setGlobalVariables( variables );	
	});

	//update loading bar
	socket.on( "progress", function() {
		addCluster();
		var p = Math.floor( ( 100 - ( level[level.length - 1].length / startProgress ) * 100 ) );
		
		if( level[level.length - 1].length <= 1 ) {
			//prepare variables to be sent to client
			var object = setReturnObject();
			io.emit( "cluster", object ); //<-- send object to client
		}
		else {
			var progress = { "p": p };
			io.emit( "progress", progress );
		}	
	});

	//write variables into a .json file
	socket.on("save", function( variables ) {

		//get file name
		var fileName = variables.fileName.split(".");

		//encode rest of object to JSON
		var json = JSON.stringify( variables );

		//write to file
		fs.writeFile(  fileName[0] + ".json", json, function (err) {
  			if (err) throw err;
  			console.log("File : " + fileName[0] + ".json " + "saved");
		});

		//send success message back to client
		io.emit( "save" );
	});

	//use sample.json data to run demo
	socket.on("demo", function() {
		console.log( "Demo" );
		var data = JSON.parse( fs.readFileSync("./sample-data/sample.json", "utf8" ));
		io.emit( "demo", data );
	});
	
});

function setGlobalVariables( variables ) {
	patterns = variables.patterns;
	clusRef = variables.clusRef;
	simTable = variables.simTable;
	priorityQueue = variables.priorityQueue;
	level = variables.level;
}

function setReturnObject() {
	var object = {
		"patterns": patterns,
		"clusRef": clusRef,
		"simTable": simTable,
		"level": level
	};
	return object;
}

function addCluster() {
	var clusters = [];
	clusters = clusters.concat( level[level.length - 1] );
	var simClus = checkForDuplicate();

	//new cluster and its parents
	var newCluster = simClus[0] + "-" + simClus[1];
	clusRef[newCluster] = simClus;

	clusters = updateClusters( clusters, simClus );
	clusters.push( newCluster );
	
	updateSimTable( simClus, clusters );
}

function checkForDuplicate() {
	var simClus = priorityQueue[0].split( "+" );
	if( simClus[0] === simClus[1] ) {
		priorityQueue.splice( 0, 1 );
		simClus = checkForDuplicate();
	}
	return simClus;
}

function updateClusters( clusters, simClus ) {
	//search for and remove two
	var index = binarySearch( clusters, simClus[0] );
	clusters.splice( index, 1 );

	index = binarySearch( clusters, simClus[1] );
	clusters.splice( index, 1 );

	return clusters;
}

function updateSimTable( simClus, clusters ) {
	var comps1 = []; //<-- clusters compared to simClus0
	var comps2 = []; //<-- clusters compared to simClus1

	//remove simClus from priority queue
	priorityQueue.splice( 0, 1 );

	/* loop through clusters looking for when they are compared to
	either of the two patterns/clusters in question */
	for( var j = 0; j < clusters.length; j++ ) {
		if( simTable[ clusters[j] + "+" + simClus[0] ] !== undefined ) {
			var comp1 = setComparison( clusters[j] + "+" + simClus[0] );
			comps1.push( comp1 );
			removeFromQueue( comp1 ); //<-- remove redundant comparison from queue
		}
		if( simTable[ simClus[0] + "+" +  clusters[j] ] !== undefined  ) {
			var comp1 = setComparison( simClus[0] + "+" +  clusters[j] );
			comps1.push( comp1 );
			removeFromQueue( comp1 );//<-- remove redundant comparison from queue
		}
		if( simTable[ clusters[j] + "+" + simClus[1] ] !== undefined ) {
			var comp2 = setComparison( clusters[j] + "+" + simClus[1] );
			comps2.push( comp2 );
			removeFromQueue( comp2 ); //<-- remove redundant comparison from queue
		}
		if( simTable[ simClus[1] + "+" + clusters[j] ] !== undefined ) {
			var comp2 = setComparison( simClus[1] + "+" + clusters[j] );
			comps2.push( comp2 );
			removeFromQueue( comp2 ); //<-- remove redundant comparison from queue
		}
	}

	//get the two patterns/clusters that are most similar
	var tmpQueue = compareNewClus( simClus, comps1, comps2 );

	//insert tmpQueue comparisons into priorityQueue
	updateQueue( tmpQueue );
	
	level.push( clusters );
}

function setComparison( key ) {
	var comp = { //<-- comparison
		key : "",
		value : 0
	};

	comp.key = key;
	comp.value = simTable[comp.key];
	return comp;
}

function removeFromQueue( comparison ) {
	var index = binarySearch( priorityQueue, comparison.key );
	priorityQueue.splice( index, 1 );
}

function compareNewClus( simClus, comps1, comps2 ) {
	var tmpQueue = []; //<-- temporary queue of new clusters
	var best = 0; //<-- best similarity comparison between clusters

	//loop through comps 1 and 2. Get mean similarity of their elements
	for( var i = 0; i < comps1.length; i++ ) {
		var clus = comps1[i].key.split( "+" );
		var ref = "";

		//get cluster not in simClus
		if( clus[0] !== simClus[0] && clus[0] !== simClus[1] ) {
			ref = clus[0];
		}
		else {
			ref = clus[1];
		}

		//create key and value for new cluster comparison
		var newKey = ref + "+" + simClus[0] + "-" + simClus[1];
		best = mean( comps1[i].value, comps2[i].value );

		simTable[newKey] = best; //<-- add to simTable
		tmpQueue.push( newKey ); //<-- add to temporary queue of new clusters
	}
	return tmpQueue;
}

function mean( num1, num2 ) {
	var total = num1 + num2;
	total = total / 2;
	return total;
}

function updateQueue( tmpQueue ) {
	//sort tmpQueue
	tmpQueue = mergeSort( tmpQueue );

	//insert tmpQueue comparisons into priorityQueue
	var insert = 0;
	for( var i = 0; i < tmpQueue.length; i++ ) {
		insert = binaryInsert( 0, priorityQueue.length - 1, simTable[ tmpQueue[i] ] );
		priorityQueue.splice( insert, 0, tmpQueue[i] );
	}
}

function binarySearch( array, key ) {
	/* 
		This code is based on an Neill Campbells lecture notes. 
	*/

	var low = 0, high = array.length - 1;
	var keyValue = simTable[key];

	while( low <= high ) {
		var middle = Math.floor( low + ( ( high - low ) / 2 ) );
		var midValue = simTable[ array[middle] ];

		//check to see if found key
		if( key === array[middle] ) {
			return middle;
		}
		else if( keyValue === midValue ) {
			/* some comparisons have the same value. 
			This bit catches those ones */
			var padding = Math.floor( array.length / 100 );
			low = low - padding;
			high = high + padding;
			for( var i = (low - 1); i <= high; i++ ) {
				if( array[i] === key ) {
					return i;
				}
			}
		}
		else {
			//use right of middle
			if( keyValue < midValue ) {
				low = middle + 1;
			}
			//use left of middle
			else {
				high = middle - 1;
			}
		}
	}

	return -1;
}

function binaryInsert( low, high, key ) {
	/* 
		This code is based on an example from: 
		http://jeffreystedfast.blogspot.co.uk/2007/02/binary-insertion-sort.html 
	*/

	var middle = Math.floor( low + ( ( high - low ) / 2 ) );
	var midElement = simTable[ priorityQueue[middle] ];

	//stop if only one element in current view of array
	if( low === high ) {
		return low;
	}

	//decide if key is on left or right of middle element
	if( key < midElement ) {
		return binaryInsert( middle + 1, high, key );
	}
	else if( key > midElement ) {
		return binaryInsert( low, middle, key );
	}

	return middle;
}

function mergeSort( array ){
    //arrays with 0 or 1 elements don't need sorting
    if( array.length < 2 ) {
        return array;
    }

    //split array in half.
    var middle = Math.floor( array.length / 2 ),
        left = array.slice( 0, middle ),
        right = array.slice( middle );

    /* Recursively split arrays, sort them and then re-merge 
    them back together until the original array is returned */
    return merge( mergeSort( left ), mergeSort( right ) );
}

function merge( left, right ){
    var result = [], il = 0, ir = 0;

    /* Compare elements from left and right arrays adding smaller one to 
    result array. Do this until one of the arrays is empty. */
    while ( il < left.length && ir < right.length ){
        if( simTable[ left[il] ] > simTable[ right[ir] ] ){
            result.push( left[il++] );
        } 
        else {
            result.push( right[ir++] );
        }
    }

    //concat what is left of left and right to result
    return result.concat( left.slice(il) ).concat( right.slice(ir) );
}

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