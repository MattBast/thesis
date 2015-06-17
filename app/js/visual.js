//upload file when input changes
var fileInput = document.getElementById( "fileInput" );
fileInput.addEventListener("change", upload );

var linkage = document.getElementsByName("linkage");

var patterns = [];
var clusRef = new Map(); //<-- references the parents of a cluster
var clusSim = new Map(); //<-- the Jaccard similarity between two patterns
var priorityQueue = []; //<-- orders patterns/clusters by similarity

//each element represents a level in the hierarchical clustering
var level = [];
var dataset = []; 

//lists of entities and indexs
var entity = new Map();

function upload() {
	if( fileInput.files.length > 0 ) {

		var file = fileInput.files[0];
		console.log( "Upload", file.name );

		var reader = new FileReader();
		readFile( file, reader );

	}
	else {
		alert("File is empty");
	}
}

function readFile( file, reader ) {
	reader.addEventListener("load", function() {

		var array = reader.result.split( " " );

		var map = new Map();

		var count = 1;

		//find a pattern in file. Store each entity as a key - value
		for( var i = 0; i < array.length; i++ ) {
			if( array[i].indexOf( "." ) != -1 && !isNaN( array[i] ) ) { 
				var pat = new Map(); //<-- pattern
				pat.set( 0, array[i] ); //<-- interestingness
				patterns.push( pat );

			}
			if( array[i].indexOf( "." ) != -1 && isNaN( array[i] ) ) {
				if( !map.has( array[i] ) ) {
					map.set( array[i], count );
					pat.set( count, array[i] );
					count++;
				}
				else {
					pat.set( map.get( array[i] ), array[i] );
				}
			}
		}
		keyValueSwap( map );
		console.log( "Finished reading" );
		patterns = sparseMatrix();
		main();

	});
	reader.readAsText( file );
}

function keyValueSwap( map ) {
	var count = 0;
	for( var key of map.keys() ) {
		entity.set( count, key );
		count++;
	}
}

function sparseMatrix() {
	var newPats = new Map(); //<-- new patterns

	for( var i = 0; i < patterns.length; i++ ) {
		var e = []; //<-- new array of entities in pattern
		for( var key of entity.keys() ) {
			if( patterns[i].has(key) ) {
				e.push(1);
			}
			else {
				e.push(0);
			}
		}
		newPats.set( i, e );
	}

	return newPats;
}

function main() {
	initClusters();
	console.log( "Completed initial clustering" );

	var simTable = buildSimTable();
	console.log( "Finished building simTable" );

	//keep clustering the patterns until there are only three clusters
	while( level[level.length - 1].length > 4 ) {
		simTable = addCluster( simTable );
	}

	console.log( "Got to top of tree" );
	visualise( false );
}

function initClusters() { 
	var clusters = [];
	var parents = [];
	for( var i = 1; i < 21; i++ ) { 
		clusters.push( i.toString() );
		clusRef.set( i.toString(), parents );
	}
	level.push( clusters );
}

function buildSimTable() {
	var simTable = new Map(); //<-- records how similar patterns are
	for( var i = 0; i < 20; i++ ) { 
		for( var j = i; j < 20; j++ ) { 
			var iKey = (i + 1).toString();
			var jKey = (j + 1).toString();
			if( j === i ) { 
				simTable.set( iKey + "+" + jKey, 0 );
				priorityQueue.push( iKey + "+" + jKey );
			}
			else {
				var sim = similarity( patterns.get(i), patterns.get(j) );
				simTable.set( iKey + "+" + jKey, sim );
				clusSim.set( iKey + "+" + jKey, sim );
				priorityQueue = addToQueue( priorityQueue, simTable,
					iKey + "+" + jKey );
			}	
		}
	}
	return simTable;
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

function addToQueue( queue, simTable, newSim ) {
	for( var i = 0; i < queue.length; i++ ) {
		if( simTable.get( newSim ) > simTable.get( queue[i] ) ) {
			queue.splice( i, 0, newSim );
			return queue;
		}
	}
	queue.push( newSim );
	return queue;
}

function addCluster( simTable ) {
	var clusters = level[level.length - 1];
	var simClus = priorityQueue[0].split( "+" );
	simTable.delete( simClus[0] + "+" + simClus[1] );

	//new cluster and its parents
	var newCluster = simClus[0] + "-" + simClus[1];
	clusRef.set( newCluster, simClus );

	clusters= updateClusters( clusters, simClus );
	clusters.push( newCluster );
	
	simTable = updateSimTable( simTable, simClus, clusters );
	
	return simTable;
}

function updateClusters( clusters, simClus ) {
	for( var i = 0; i < clusters.length; i++ ) {
		if( clusters[i] === simClus[0] || clusters[i] === simClus[1] ) {
			clusters.splice( i, 1 );
			i--;
		}
	}
	return clusters;
}

function updateSimTable( simTable, simClus, clusters ) {
	var tmp1 = [];
	var tmp2 = [];

	simTable = removeSamePats( simTable, simClus );

	for( var j = 0; j < clusters.length; j++ ) {
		var object = {
			key : "",
			value : 0
		};
		if( simTable.has( clusters[j] + "+" + simClus[0] ) ) {
			object.key = clusters[j] + "+" + simClus[0];
			object.value = simTable.get( object.key );
			tmp1.push( object );
			simTable.delete( object.key );
		}
		if( simTable.has( simClus[0] + "+" +  clusters[j] ) ) {
			object.key = simClus[0] + "+" +  clusters[j];
			object.value = simTable.get( object.key );
			tmp1.push( object );
			simTable.delete( object.key );
		}
		if( simTable.has( clusters[j] + "+" + simClus[1] ) ) {
			object.key = clusters[j] + "+" + simClus[1];
			object.value = simTable.get( object.key );
			tmp2.push( object );
			simTable.delete( object.key );
		}
		if( simTable.has( simClus[1] + "+" +  clusters[j] ) ) {
			object.key = simClus[1] + "+" +  clusters[j];
			object.value = simTable.get( object.key );
			tmp2.push( object );
			simTable.delete( object.key );
		}
	}

	var newClusSims = compareNewClus( simClus, tmp1, tmp2 );
	simTable = updateTableAndQueue( simTable, newClusSims );
	
	level.push( clusters );
	return simTable;
}

function removeSamePats( simTable, simClus ) {
	//remove comparisons where a pattern is compared to itself
	if( simTable.has( simClus[0] + "+" +  simClus[0] ) ) {
		simTable.delete( simClus[0] + "+" +  simClus[0] );
	}
	if( simTable.has( simClus[1] + "+" +  simClus[1] ) ) {
		simTable.delete( simClus[1] + "+" +  simClus[1] );
	}

	return simTable;
}

function compareNewClus( simClus, tmp1, tmp2 ) {
	var newClusSims = new Map();
	var best = 0;
	for( var i = 0; i < tmp1.length; i++ ) {
		var clus = tmp1[i].key.split( "+" );
		var ref = "";
		if( clus[0] !== simClus[0] && clus[0] !== simClus[1] ) {
			ref = clus[0];
		}
		else {
			ref = clus[1];
		}

		var newKey = ref + "+" + simClus[0] + "-" + simClus[1];
		best = mostSimilar( tmp1[i].value, tmp2[i].value );
		newClusSims.set( newKey, best );
	}
	return newClusSims;
}

function mostSimilar( num1, num2 ) {
	var best = 0;

	if( linkage[1].checked ) { //<-- complete linkage
		best = Math.min( num1, num2 );
	}
	else if( linkage[2].checked ) { //<-- average linkage
		best = mean( num1, num2 );
	}
	else { //<-- single linkage
		best = Math.max( num1, num2 );
	}

	return best;
}

function updateTableAndQueue( simTable, newClusSims ) {
	//add new clusters to simTable and priorityQueue
	for( var key of newClusSims.keys() ) {
		simTable.set( key, newClusSims.get( key ) );
		clusSim.set( key, newClusSims.get( key ) ); 
		priorityQueue = addToQueue( priorityQueue, simTable, key );
	}

	//take out redundant clusters from priorityQueue
	for( var c = 0; c < priorityQueue.length; c++ ) {
		if( simTable.has( priorityQueue[c] ) === false ) {
			priorityQueue.splice( c, 1 );
			c--;
		}
	}
	return simTable;
}

function mean( num1, num2 ) {
	var total = num1 + num2;
	total = total / 2;
	return total;
}

function visualise( resetBox ) {
	var n = getNodes( level[ level.length - 1 ] );
	var e = getEdges( n );
	dataset = { nodes: n, edges: e };
	console.log( dataset );
	/*
	var currentLevel = 0;
	var largestClus = 0;
	for( var j = 0; j < dataset.length; j++ ) {
		var clusLength = dataset[j].split( "-" ).length;
		currentLevel += clusLength;
		if( clusLength > largestClus ) {
			largestClus = clusLength;
		}
	}
	*/

	var w = 500;
	var h = 500;

	var force = d3.layout.force()
					.nodes(dataset.nodes)
					.links(dataset.edges)
					.size([w, h])
					.linkDistance([100])
					.charge([-100])
					.start();

	var colors = d3.scale.category10();

	var svg = d3.select("#visual")
				.append("svg")
				.attr("width", w)
				.attr("height", h);

	var links = svg.selectAll("line")
					.data(dataset.edges)
					.enter()
					.append("line")
					.attr("class", "link")
					.style("stroke", "#000000")
					.style("stroke-width", 3);

	var nodes = svg.selectAll("circle")
					.data(dataset.nodes)
					.enter()
					.append("circle")
					.attr("class", "node")
					.attr("r", 10)
					.style("fill", function(d, i) {
						return colors(i);
					})
					.call(force.drag);

	force.on("tick", function() {
		links.attr("x1", function(d) { return d.source.x; } )
			 .attr("y1", function(d) { return d.source.y; } )
			 .attr("x2", function(d) { return d.source.x; } )
			 .attr("y2", function(d) { return d.source.y; } );

		nodes.attr("cx", function(d) { return d.x; } )
			 .attr("cy", function(d) { return d.y; } );
	});
}

function getNodes( c ) {
	var node;
	var nodes = [];
	for( var i = 0; i < c.length; i++ ) {
		var parents = clusRef.get( c[i] );
		node = { id: parents[0] };
		nodes.push( node );
		node = { id: parents[1] };
		nodes.push( node );
	}
	return nodes;
}

function getEdges( nodes ) {
	var edge;
	var edges = [];
	for( var i = 0; i < nodes.length; i++ ) {
		for( var j = 0; j < nodes.length; j++ ) {
			if( clusSim.has( nodes[i].id + "+" + nodes[j].id ) ) {
				edge = { source: i, target: j };
				edges.push( edge );
			}
		}	
	}
	return edges;
}
