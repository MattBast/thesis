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
var dataset = {}; 

//lists of entities and indexs
var entity = new Map();

//displays how high up the tree the user is
var patternsPresent = document.getElementById( "patternsPresent" );

//create table tag
var total = new Map();

//how many colour groups the user wants
var numOfGroups = getNumOfGroups();

//table search bar
var box = document.getElementById( "searchBar" );

//force diagram components
var nodes = [], links = [];
var visDiv = document.getElementById("visual");
var w = visDiv.clientWidth, h = 500;
var svg = d3.select("#visual")
			.append("svg")
			.attr("width", w)
			.attr("height", h);
var force = d3.layout.force();
var marker; //<-- tells user how many patterns are available (approximately)

//the classes of the buttons corresponding to the node groupings
var buttons = [ 
		"one",
		"two",
		"three",
		"four",
		"five",
		"six",
		"seven",
		"eight",
		"nine",
		"ten"
	];

function upload() {
	if( fileInput.files.length > 0 ) {

		var file = fileInput.files[0];
		console.log( "Uploaded", file.name );

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

	priorityQueue = mergeSort( priorityQueue, simTable );

	//keep clustering the patterns until there are only three clusters
	while( level[level.length - 1].length > 1 ) {
		simTable = addCluster( simTable );
	}

	console.log( "Finished clustering" );
	visualise( level[ level.length - numOfGroups ] );
}

function initClusters() { 
	var clusters = [];
	var parents = [];
	for( var i = 1; i < 201; i++ ) { 
		clusters.push( i.toString() );
		clusRef.set( i.toString(), parents );
	}
	level.push( clusters );
}

function buildSimTable() {
	//records how similar two patterns/clusters compared to one another
	var simTable = new Map(); 
	//loop through patterns and compare them against one another
	for( var i = 0; i < 200; i++ ) { 
		for( var j = i; j < 200; j++ ) { 
			var iKey = (i + 1).toString();
			var jKey = (j + 1).toString();
			if( j === i ) { 
				simTable.set( iKey + "+" + jKey, 0 );
			}
			else {
				var sim = similarity( patterns.get(i), patterns.get(j) );
				simTable.set( iKey + "+" + jKey, sim );
				clusSim.set( iKey + "+" + jKey, sim );
			}
			priorityQueue.push( iKey + "+" + jKey );	
		}
	}
	return simTable;
}

function mergeSort( array, simTable ){

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
    return merge( mergeSort( left, simTable ), mergeSort( right, simTable ), simTable );
}

function merge( left, right, simTable ){
    var result = [], il = 0, ir = 0;

    /* Compare elements from left and right arrays adding smaller one to 
    result array. Do this until one of the arrays is empty. */
    while ( il < left.length && ir < right.length ){
        if( simTable.get( left[il] ) > simTable.get( right[ir] ) ){
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

function addToQueue( queue, simTable, newSim ) {
	//if clusters are disjoint (similarity of 0), push to end of queue
	if( simTable.get( newSim ) === 0 ) {
		queue.push( newSim );
		return queue;
	}
	/* else start from beginning of queue. If find a comparison with a 
	lower similarity score, splice in new comparison */
	else {
		for( var i = 0; i < queue.length; i++ ) {
			if( simTable.get( newSim ) > simTable.get( queue[i] ) ) {
				queue.splice( i, 0, newSim );
				return queue;
			}
		}
		/* push comparison onto the end of the queue if it has the 
		lowest similarity in the queue */
		queue.push( newSim );
		return queue;
	}
}

function addCluster( simTable ) {
	var clusters = [];
	clusters = clusters.concat( level[level.length - 1] );
	var simClus = checkForDuplicate( simTable );

	simTable.delete( simClus[0] + "+" + simClus[1] );

	//new cluster and its parents
	var newCluster = simClus[0] + "-" + simClus[1];
	clusRef.set( newCluster, simClus );

	clusters = updateClusters( clusters, simClus );
	clusters.push( newCluster );
	
	simTable = updateSimTable( simTable, simClus, clusters );
	
	return simTable;
}

function checkForDuplicate( simTable ) {
	var simClus = priorityQueue[0].split( "+" );
	if( simClus[0] === simClus[1] ) {
		priorityQueue.splice( 0, 1 );
		simClus = checkForDuplicate();
	}
	return simClus;
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

	/* loop through clusters looking for when they are compared to
	either of the two patterns/clusters in question */
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
		if( simTable.has( simClus[1] + "+" + clusters[j] ) ) {
			object.key = simClus[1] + "+" + clusters[j];
			object.value = simTable.get( object.key );
			tmp2.push( object );
			simTable.delete( object.key );
		}
	}

	//get the two patterns/clusters that are most similar
	var newClusSims = compareNewClus( simClus, tmp1, tmp2 );
	simTable = updateTableAndQueue( simTable, newClusSims );
	
	level.push( clusters );
	return simTable;
}

function compareNewClus( simClus, tmp1, tmp2 ) {
	var newClusSims = new Map();
	var best = 0;
	for( var i = 0; i < tmp1.length; i++ ) {
		var clus = tmp1[i].key.split( "+" );
		var ref = "";
		//make sure not to compare cluster to itself
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

function mean( num1, num2 ) {
	var total = num1 + num2;
	total = total / 2;
	return total;
}

function updateTableAndQueue( simTable, newClusSims ) {
	var tmpQueue = [];
	//add new clusters to simTable, clusSim and priorityQueue
	for( var key of newClusSims.keys() ) {
		simTable.set( key, newClusSims.get( key ) );
		clusSim.set( key, newClusSims.get( key ) ); 
		tmpQueue.push( key );
	}

	//sort tmpQueue
	tmpQueue = mergeSort( tmpQueue, newClusSims );

	/* add in new comparisons and take out redundant ones from
	priorityQueue */
	for( var i = 0; i < priorityQueue.length; i++ ) {
		if( simTable.has( priorityQueue[i] ) === false ) {
			priorityQueue.splice( i, 1 );
			i--;
		}
		if( simTable.get( priorityQueue[i] ) < simTable.get( tmpQueue[j] ) ) {
			priorityQueue.splice( i, 0, tmpQueue[j] );
			j++;
		}
	}

	var j = 0;
	for( var i = 0; i < priorityQueue.length; i++ ) {
		if( simTable.get( tmpQueue[j] ) > simTable.get( priorityQueue[i] ) ) {
			priorityQueue.splice( i - 1, 0, tmpQueue[j] );
			j++;
			i--;
		}
	}

	return simTable;
}

function getNumOfGroups() {
	var input = document.getElementById( "groups" ).value;
	if( input <= 10 ) {
		return input
	}
	else {
		return 10;
	}
}

function visualise( clusters ) {
	//build dataset
	var originalNodes = getNodes( clusters );
	var n = getMoreNodes( originalNodes );
	var e = getEdges( n );
	dataset = { nodes: n, edges: e };

	var largestClus = getLargestCluster( n );

	//for highlighting and selecting colour groups of nodes
	groupButtons( largestClus ); 

	//draw line to tell user approximately how many patterns are visable
	drawLine();

	//tells user precisely how many patterns are visible
	resetButtonBox( n );
	
	//determines size of nodes
	var rScale = d3.scale.linear()
				.domain([ 0, largestClus ])
				.range([5, 20]);

	//scales Jaccard similarity to pixels.
	var distScale = d3.scale.linear()
			.domain([0, 1])
			.range([300, 50]);

	//create force directed layout
	force.nodes(dataset.nodes)
		.links(dataset.edges)
		.size([w, h])
		.linkDistance(function(d) {
			return distScale(d.value);
		})
		.charge([-400])
		.start();

	//draw a line for every element in edges array
	links = drawLinks( dataset.edges );

	//draw a node for every element in nodes array
	nodes = drawNodes( dataset.nodes, rScale );

	//calculates x and y coordinates of every element
	force.on("tick", tick ); 
	
	createTable( clusters );
}

function groupButtons( largestClus ) {
	//determines size of nodes
	var rScale = d3.scale.linear()
				.domain([ 0, largestClus ])
				.range([5, 20]);

	var colours = d3.scale.category10(); //<-- array on hex colours
	var circle = svg.selectAll("circle");

	circle.data(buttons)
		.enter()
		.append("circle")
		.attr("r", 8)
		.attr("cx", function(d, i) {
			return (w - 20) - (i * 20);
		})
		.attr("cy", 20 )
		.attr("class", function(d) {
			return d;
		})
		.on("mouseover", function(d, i) {
			var buttonClass = buttons[i];

			d3.selectAll("." + buttonClass)
				.style("stroke-width", 5)
				.style("stroke", "#FFCC00");

		})
		.on("mouseout", function(d, i) {
			var buttonClass = buttons[i];

			d3.selectAll("." + buttonClass)
				.style("stroke-width", 1.5)
				.style("stroke", "#000000");
		})
		.on("click", function(d) {
			//get new data
			dataset = newDataset( dataset, d );

			//change data in layout
			force.nodes(dataset.nodes)
				.links(dataset.edges)
				.start();
			
			nodes = nodes.data( dataset.nodes );
			links = links.data( dataset.edges );

			//remove spare nodes and links
			nodes.exit().remove();
			links.exit().remove();

			//update links
			links.attr("class", "link");

			//update nodes
			nodes.transition().delay(500).duration(1000)
				.attr("class", function(d, i) {
					return d.class;
				})
				.attr("r", function(d) {
					var length = d.id.split( "-" ).length;
					return rScale( length );
				});
			//change data appearing in hover effect
			nodes.on("mouseover", hover )
				.on("mouseout", hideTooltip )
				.call(force.drag);

			//calculates x and y coordinates of every element
			force.on("tick", tick ); 

			//update frequency table
			updateTable( dataset.nodes );

			updateLine( dataset.nodes );
		});
}

function drawLine() {
	var line = svg.append("line")
		.attr("x1", 25)
		.attr("y1", 25)
		.attr("x2", 25)
		.attr("y2", 475)
		.attr("stroke", "black")
		.attr("stroke-width", 1.5);

	marker = svg.append("line")
		.attr("x1", 20)
		.attr("y1", 25)
		.attr("x2", 30)
		.attr("y2", 25)
		.attr("id", "marker")
		.attr("stroke", "black")
		.attr("stroke-width", 3);
}

function updateLine( nodes ) {
	//determines where marker will be
	var markScale = d3.scale.linear()
					.domain([1, level[0].length])
					.range([475, 25]);
	
	var numPats = 0;
	for( var i = 0; i < nodes.length; i++ ) {
		numPats += nodes[i].id.split( "-" ).length;
	}
	var position = markScale( numPats );

	marker = marker
		.attr("y1", position)
		.attr("y2", position);
}

function getNodes( c ) {
	var node;
	var nodes = [];
	for( var i = 0; i < c.length; i++ ) {
		node = { id: c[i], class: buttons[i] };
		nodes.push( node );
	}
	return nodes;
}

function getMoreNodes( originalNodes ) {
	var node;
	var newNodes = [];
	var parents = [];
	while( newNodes.length < 20 ) {
		var onePat = 0; //<-- count how many patterns have no parents

		for( var i = 0; i < originalNodes.length; i++ ) {
			parents = clusRef.get( originalNodes[i].id );

			//if a cluster contains more than one pattern, get its parents
			if( parents.length !== 0 ) {
				node = { id: parents[0], class: originalNodes[i].class };
				newNodes.push( node );
				node = { id: parents[1], class: originalNodes[i].class };
				newNodes.push( node );
			}
			//else just use the original cluster (of one pattern)
			else {
				onePat++;
				node = { id: originalNodes[i].id, class: originalNodes[i].class };
				newNodes.push( node );
			}
		
		}
		//stop if there are less than twenty patterns in current set
		if( onePat >= newNodes.length ) { break; }

		//prevents patterns turning up in newNodes more than once
		originalNodes = newNodes;
		if( newNodes.length < 20 ) { newNodes = []; }
	}	
	return newNodes;
}

function getEdges( nodes ) {
	var edge;
	var edges = [];
	for( var i = 0; i < nodes.length; i++ ) {
		for( var j = 0; j < nodes.length; j++ ) {
			if( ( i !== j ) && ( clusSim.has( nodes[i].id + "+" + nodes[j].id ) ) ) {
				edge = { source: i, target: j, value: clusSim.get( nodes[i].id + "+" + nodes[j].id ) };
				edges.push( edge );
			}
			else {
				var similarity = compareNodes( nodes[i].id, nodes[j].id );
				clusSim.set( nodes[i].id + "+" + nodes[i].id, similarity );
				edge = { source: i, target: j, value: similarity };
				edges.push( edge );
			}
		}	
	}
	return edges;
}

function compareNodes( node1, node2 ) {
	var comparisons = new Map();
	var comparison;
	var best = 0; //<-- the comparison that best satisfies the specified linkage

	var patterns1 = node1.split( "-" );
	var patterns2 = node2.split( "-" );

	for( var i = 0; i < patterns1.length; i++ ) {
		for( var j = 0; j < patterns2.length; j++ ) {
			if( clusSim.has( patterns1[i] + "+" + patterns2[j] ) ) {
				comparison = patterns1[i] + "+" + patterns2[j];
				comparisons.set( comparison, clusSim.get( comparison ) ); 
			}
			if( clusSim.has( patterns2[j] + "+" + patterns1[i] ) ) {
				comparison = patterns2[j] + "+" + patterns1[i];
				comparisons.set( comparison, clusSim.get( comparison ) ); 
			}
		}
	}

	for( var value of comparisons.values() ) {
		if( best === 0 ) {
			best = value;
		}
		else {
			best = mostSimilar( best, value );
		}
	}

	return best;
}

function newDataset( oldDataset, clickedClass ) {
	var node;
	var count = 0;
	var newDataset = { nodes: [], edges: [] };
	var oldNodes = oldDataset.nodes;

	//loop through dataset and pick out nodes that match the clicked class
	for( var i = 0; i < oldNodes.length; i++ ) {
		if( oldNodes[i].class === clickedClass ) {
			node = { id: oldNodes[i].id, class: buttons[count] }
			newDataset.nodes.push( node );
			count++;
		}
	}
	
	//update how many patterns are present
	resetButtonBox( newDataset.nodes );

	//create groups of nodes
	newDataset.nodes = getMoreNodes( newDataset.nodes );

	//get the edges
	newDataset.edges = getEdges( newDataset.nodes );

	return newDataset;
}

function getLargestCluster( nodes ) {
	var largestClus = 0;
		for( var j = 0; j < nodes.length; j++ ) {
			var clusLength = nodes[j].id.split( "-" ).length;
			if( clusLength > largestClus ) {
				largestClus = clusLength;
		}
	}
	return largestClus;
}

function resetButtonBox( nodes ) {
	var numPats = 0;
	for( var i = 0; i < nodes.length; i++ ) {
		numPats += nodes[i].id.split( "-" ).length;
	}
	patternsPresent.innerHTML = "Patterns present: " + numPats;
}

function resetVis() {
	//remove previous visualisation
	dataset = { nodes: [], edges: [] };
	nodes = nodes.data( dataset.nodes );
	links = links.data( dataset.edges );
	nodes.exit().remove();
	links.exit().remove();

	//remove marker ready for it to be re-drawn
	d3.select("#marker").remove();

	//remove the frequency table ready for it to be re-drawn
	total.clear();
	d3.select( "table" ).remove();

	//find out how many groups the user wants this time
	numOfGroups = getNumOfGroups();

	//re-visualise everything
	visualise( level[ level.length - numOfGroups ] );
}

function drawLinks( dataEdges ) {
	var links = svg.selectAll(".link")
		.data(dataEdges)
		.enter()
		.append("line")
		.attr("class", "link");

	return links;
}

function drawNodes( dataNodes, rScale ) {
	var colours = d3.scale.category10(); //<-- array on hex colours

	var nodes = svg.selectAll(".node")
				.data(dataNodes)
				.enter()
				.append("circle")
				.attr("class", function(d, i) {
					return d.class;
				})
				.attr("r", function(d) {
					var length = d.id.split( "-" ).length;
					return rScale( length );
				})
				.on("mouseover", hover )
				.on("mouseout", hideTooltip )
				.on("click", clickNode )
				.call(force.drag);

	return nodes;
}

function hover( d, i ) {
	var yPos = parseFloat(d3.select("svg").attr("y"));
	var frequency = getFrequency( d.id );

	var topThree = "";
	var count = 0;
	for( var key of frequency.keys() ) {
		count++;
		topThree += key + " " + frequency.get( key ) + " "; 
		if( count === 3 ) { break; }
	}

	d3.select("#tooltip")
		.style("left", 0)
		.style("top", (yPos + 20) + "px")
		.select("#value")
		.text( topThree );

	d3.select("#tooltip").classed("hidden", false);
}

function hideTooltip() {
	d3.select("#tooltip").classed("hidden", true);
}

function clickNode( d ) {
	var yPos = parseFloat(d3.select("svg").attr("y"));
	var text = d.id + " ";
	for( var key of frequency.keys() ) {
		text += key + " " + frequency.get( key ) + " "; 
	}

	d3.select("#tooltip2")
		.style("left", 500 + "px")
		.style("top", (yPos + 20) + "px")
		.select("#value2")
		.on("click", function() {
			d3.select("#tooltip2").classed("hidden", true);
		})
		.text( text );

	d3.select("#tooltip2").classed("hidden", false);
}

function tick() {
	links.attr("x1", function(d) { return d.source.x; } )
		.attr("y1", function(d) { return d.source.y; } )
		.attr("x2", function(d) { return d.source.x; } )
		.attr("y2", function(d) { return d.source.y; } );
	
	nodes.attr("cx", function(d) { return d.x; } )
		.attr("cy", function(d) { return d.y; } );
}

function createTable( clusters ) {
	var sortedTotal = getSortedTotal( clusters );
	sortedTotal = sortedTotal.splice( 0, 10 );

	var table = d3.select("body").append("table");

	createTableHead( table );

	//create rows for the table
	var tr = table.selectAll("tr")
				.data( sortedTotal )
				.enter()
				.append("tr")
				.on("click", clickRow );

	//put data in the cells on each row of the table
	putDataInRows( tr );

	//search table for entities
	d3.select("#searchButton").on("click", searchTable );

	//return table to original state
	d3.select("#topTenButton")
		.on("click", function() {
			d3.select("#topTenButton").classed("hidden", true);
			d3.select( "table" ).remove();

			table = d3.select("body").append("table");

			createTableHead( table );

			var tr = table.selectAll("tr")
						.data( sortedTotal )
						.enter()
						.append("tr")
						.on("click", clickRow );

			//put data in the cells on each row of the table
			putDataInRows( tr );
		})

	//deselect rows and return nodes stroke to black
	d3.select("#deselect")
		.on("click", deselectRows );
}

function updateTable( dataNodes ) {
	//convert dataset into just array of cluster references
	var clusters = [];
	for( var i = 0; i < dataNodes.length; i++ ) {
		clusters.push( dataNodes[i].id );
	}
	
	//create a sorted array of clusters
	total.clear();
	var sortedTotal = getSortedTotal( clusters );
	sortedTotal = sortedTotal.splice( 0, 10 );

	d3.select("#topTenButton").classed("hidden", true);
	d3.select( "table" ).remove();

	table = d3.select("body").append("table");

	createTableHead( table );

	var tr = table.selectAll("tr")
				.data( sortedTotal )
				.enter()
				.append("tr")
				.on("click", clickRow );

	//put data in the cells on each row of the table
	putDataInRows( tr );

	//search table for entities
	d3.select("#searchButton").on("click", searchTable );

	//return table to original state
	d3.select("#topTenButton")
		.on("click", function() {
			d3.select("#topTenButton").classed("hidden", true);
			d3.select( "table" ).remove();

			table = d3.select("body").append("table");

			createTableHead( table );

			var tr = table.selectAll("tr")
						.data( sortedTotal )
						.enter()
						.append("tr")
						.on("click", clickRow );

			//put data in the cells on each row of the table
			putDataInRows( tr );
		})

	//deselect rows and return nodes stroke to black
	d3.select("#deselect")
		.on("click", deselectRows );
}

function getSortedTotal( clusters ) {
	for( var j = 0; j < clusters.length; j++ ) {
		total = combine( total, getFrequency( clusters[j] ) );
	}
	var sortedTotal = sortTotal( total );
	return sortedTotal;
}

function getFrequency( cluster ) {
	var patternRefs = cluster.split( "-" );
	var pat = [];
	frequency = new Map();
	for( var i = 0; i < patternRefs.length; i++ ) {
		pat = patterns.get( parseInt(patternRefs[i]) );
		for( var j = 0; j < pat.length; j++ ) {

			if( pat[j] === 1 && frequency.has( entity.get(j) ) ) {
				frequency.set( entity.get(j), frequency.get( entity.get(j) ) + 1 );
			}
			if( pat[j] === 1 && !frequency.has( entity.get(j) ) ) {
				frequency.set( entity.get(j), 1 );
			}
			
		}
	}
	return frequency;
}

function getPercentage( ef, tf ) {
	//ef = entity frequency, tf = total frequency
	if( ef === undefined ) { ef = 0; }
	ef = Math.round( (ef * 100) / parseInt( tf ) );
	return ef;
}

function combine( f1, f2 ) {
	var total = new Map();
	var checked = [];
	for( var key of f2.keys() ) {
		if( f1.has( key ) ) {
			total.set( key, f1.get( key ) + f2.get( key ) );
			checked.push( key );
		}
		else {
			total.set( key, f2.get( key ) );
		}
	}

	return total;
}

function sortTotal( total ) {
	var sortedTotal = [];
	for( var key of total.keys() ) {
		var entity = {
			pattern : key,
			frequency : total.get( key )
		};
		var inserted = false;
		for( var i = 0; i < sortedTotal.length; i++ ) {
			if( total.get( key ) > sortedTotal[i].frequency ) {
				sortedTotal.splice( i, 0, entity );
				inserted = true;
				break;
			}
		}
		if( inserted === false ) {
			sortedTotal.push( entity );
		}
	}
	return sortedTotal;
}

function createTableHead( table ) {
	var tableHeads = [
		{ head: "Entity"}, 
		{ head: "Frequency" }
	];

	var th = table.selectAll("th")
				.data( tableHeads )
				.enter()
				.append("th");

	th.append("td").html(function(d) { return d.head; } );
}

function clickRow(d, i) {
	//determines the max number of a specific entity a cluster could hold
	var largestClus = getLargestCluster( dataset.nodes );

	//determines intensity of red
	var colourScale = d3.scale.linear()
		.domain([0, largestClus])
		.range([100, 255]);

	var rowPattern = d.pattern;
	var totalFrequency = d.frequency;

	//de-highlight all rows
	d3.selectAll("tr").classed("highlight", false);

	//highlight selected row
	d3.select(this).classed("highlight", true);

	nodes.transition()
		.style("stroke", function(d, i) {
			var frequency = getFrequency( d.id );
			var ef = frequency.get( rowPattern ); //<-- entity frequency
			return d3.rgb( colourScale( ef ), 50, 50 );
		})
		.style("stroke-width", 5);

	nodes.on("mouseover", function(d, i) {
		var yPos = parseFloat(d3.select("svg").attr("y"));
		var frequency = getFrequency( d.id );

	var patternFrequency = frequency.get( rowPattern );

	//alter text in tooltip
	d3.select("#tooltip")
		.style("left", 0)
		.style("top", (yPos + 20) + "px")
		.select("#value")
		.text( function() {
			if( patternFrequency === undefined ) {
				return rowPattern + " 0";
			}
			else {
				return rowPattern + " " + patternFrequency;
			}
		});

		//show tooltip
		d3.select("#tooltip").classed("hidden", false);
	})
	.on("mouseout", function() {
		//hide tooltip
		d3.select("#tooltip").classed("hidden", true);
	});

	//deselect row button
	d3.select("#deselect").classed("hidden", false);
}

function putDataInRows( tr ) {
	tr.append("td")
		.attr("class", "pattern")
		.html(function(d) { return d.pattern; } );
	tr.append("td")
		.attr("class", "frequency")
		.html(function(d) { return d.frequency; } );
}

function searchTable() {
	d3.select("#topTenButton").classed("hidden", false);
	var patKey = document.getElementById( "textInput" ).value;

	var entities = [];
	for( var value of entity.values() ) {
		if( value.indexOf( patKey ) != -1 ) {
			var e = {
				pattern : value,
				frequency : total.get( value )
			};
			entities.push( e );
		}
	}

	d3.select( "table" ).remove();

	table = d3.select("body").append("table");

	createTableHead( table );

	var tr = table.selectAll("tr")
		.data( entities )
		.enter()
		.append("tr")
		.on("click", clickRow );

	//put data in the cells on each row of the table
	putDataInRows( tr );
}

function deselectRows() {
	d3.select("#deselect").classed("hidden", true);

	//de-highlight all rows
	d3.selectAll("tr").classed("highlight", false);

	//reset colour of nodes stroke
	nodes.transition()
		.style("stroke", d3.rgb( 0, 0, 0 ) )
		.style("stroke-width", 1);

	//reset tooltip to top ten
	nodes.on("mouseover", hover);
}

Array.prototype.contains = function(obj) {
    var i = this.length + 1;
    while (i--) {
        if (this[i] == obj) {
            return true;
        }
    }
    return false;
}

Array.prototype.max = function() {
	return Math.max.apply( Math, this );
}

Array.prototype.swap = function (x,y) {
  var tmp = this[x];
  this[x] = this[y];
  this[y] = tmp;
  return this;
}

Array.prototype.injectArray = function( index, array ) {
	//found this code at: http://stackoverflow.com/questions/7032550/javascript-insert-an-array-inside-another-array
	return this.slice( 0, index ).concat( array ).concat( this.slice( index ) );
}
