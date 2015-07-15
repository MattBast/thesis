//so data can be sent to the server
var socket = io.connect("http://localhost:8000");

//upload file when input changes
var fileInput = document.getElementById( "fileInput" );
fileInput.addEventListener("change", upload );

//what linkage method the user wants to use
var linkage = document.getElementsByName("linkage");

var patterns = []; //<-- the patterns and references to the entities they contain
var clusRef = new Object(); //<-- references the parents of a cluster
var simTable = new Object(); //<-- the Jaccard similarity between two patterns
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

		var ent = new Map();

		var count = 1;

		//find a pattern in file. Store each entity as a key-value
		for( var i = 0; i < array.length; i++ ) {
			//interestingness marks start of new pattern
			if( array[i].indexOf( "." ) != -1 && !isNaN( array[i] ) ) { 
				var pat = new Map(); //<-- pattern
				pat.set( 0, array[i] ); //<-- interestingness
				patterns.push( pat );

			}
			//add entity to pattern
			if( array[i].indexOf( "." ) != -1 && isNaN( array[i] ) ) {
				//if this is first instance of entity, add to entity key-value store
				if( !ent.has( array[i] ) ) {
					ent.set( array[i], count );
					pat.set( count, array[i] );
					count++;
				}
				else {
					pat.set( ent.get( array[i] ), array[i] );
				}
			}
		}
		keyValueSwap( ent );
		console.log( "Finished reading" );
		patterns = sparseMatrix();
		main();

	});
	reader.readAsText( file );
}

function keyValueSwap( ent ) {
	var count = 0;
	for( var key of ent.keys() ) {
		entity.set( count, key );
		count++;
	}
}

function sparseMatrix() {
	var newPats = new Object(); //<-- new patterns

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
		newPats[i] = e;
	}

	return newPats;
}

function main() {
	socket.emit("init"); //<-- tell server to start function
	socket.on("init", function( object ) { //<-- recieve result from server
		level.push( object.clusters );
		clusRef = object.clusRef;
		console.log( "Completed initial clustering" );

		socket.emit("build", patterns ); //<-- tell server to start function
		socket.on("build", function( object ) { //<-- recieve result from server
			simTable = object.simTable;
			priorityQueue = object.priorityQueue;
			console.log( "Finished building simTable" );

			//sort priorityQueue
			priorityQueue = mergeSort( priorityQueue );
			console.log( "Priority queue has been sorted" );

			var variables = {
				"linkage": linkage,
				"patterns": patterns,
				"clusRef": clusRef,
				"simTable": simTable,
				"priorityQueue": priorityQueue,
				"level": level
			};

			socket.emit("cluster", variables ); //<-- tell server to start function
			socket.on("cluster", function( variables ) {
				setGlobalVariables( variables );
				console.log( "Finished clustering" );

				visualise( level[ level.length - numOfGroups ] );
			});
		});	
	});
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

function getNumOfGroups() {
	var input = document.getElementById( "groups" ).value;
	if( input <= 10 ) {
		return input
	}
	else {
		return 10;
	}
}

function setGlobalVariables( variables ) {
	linkage = variables.linkage;
	patterns = variables.patterns;
	clusRef = variables.clusRef;
	simTable = variables.simTable;
	level = variables.level;
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
	while( newNodes.length < 30 ) {
		var onePat = 0; //<-- count how many patterns have no parents

		for( var i = 0; i < originalNodes.length; i++ ) {
			parents = clusRef[ originalNodes[i].id ];

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
		if( newNodes.length < 30 ) { newNodes = []; }
	}	
	return newNodes;
}

function getEdges( nodes ) {
	var edge;
	var edges = [];
	for( var i = 0; i < nodes.length; i++ ) {
		for( var j = 0; j < nodes.length; j++ ) {
			if( ( i !== j ) && ( simTable[ nodes[i].id + "+" + nodes[j].id ] !== undefined ) ) {
				edge = { source: i, target: j, value: simTable[nodes[i].id + "+" + nodes[j].id] };
				edges.push( edge );
			}
			else {
				var similarity = compareNodes( nodes[i].id, nodes[j].id );
				simTable[ nodes[i].id + "+" + nodes[i].id ] = similarity;
				edge = { source: i, target: j, value: similarity };
				edges.push( edge );
			}
		}	
	}
	return edges;
}

function compareNodes( node1, node2 ) {
	var comparisons = new Object();
	var comparison;

	var patterns1 = node1.split( "-" );
	var patterns2 = node2.split( "-" );

	for( var i = 0; i < patterns1.length; i++ ) {
		for( var j = 0; j < patterns2.length; j++ ) {
			if( simTable[ patterns1[i] + "+" + patterns2[j] ] !== undefined ) {
				comparison = patterns1[i] + "+" + patterns2[j];
				comparisons[comparison] = simTable[comparison]; 
			}
			if( simTable[ patterns2[j] + "+" + patterns1[i] ] !== undefined ) {
				comparison = patterns2[j] + "+" + patterns1[i];
				comparisons[comparison] = simTable[comparison]; 
			}
		}
	}

	var best = 0; //<-- the comparison that best satisfies the specified linkage
	for( var i in comparisons ) {
		if( best === 0 ) {
			best = comparisons[i];
		}
		else {
			best = mostSimilar( best, comparisons[i] );
		}
	}

	return best;
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

	//work out percentage of patterns this entity turns up in
	var frequency = getFrequency( d.id ); 

	var text = "";
	for( var key of frequency.keys() ) {
		var ef = frequency.get( key ); //<-- entity frequency
		var numOfPats = d.id.split( "-" ).length; //<-- number of patterns
		ef = Math.floor( (ef / numOfPats) * 100 ); //<-- get percentage (rounded down)

		text += key + " " + frequency.get( key ) + " " + ef + "% "; 
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
	var frequency = new Map();
	for( var i = 0; i < patternRefs.length; i++ ) {
		pat = patterns[parseInt(patternRefs[i])];
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
		.domain([0, 100])
		.range([100, 255]);

	var rowPattern = d.pattern;
	var totalFrequency = d.frequency;

	//de-highlight all rows
	d3.selectAll("tr").classed("highlight", false);

	//highlight selected row
	d3.select(this).classed("highlight", true);

	nodes.transition()
		.style("stroke", function(d, i) {
			//returns a map of all entitys and their frequency
			var frequency = getFrequency( d.id ); 

			var ef = frequency.get( rowPattern ); //<-- entity frequency
			var numOfPats = d.id.split( "-" ).length; //<-- number of patterns
			ef = (ef / numOfPats) * 100;

			if( ef === 0 ) {
				return d3.rgb( 0, 50, 50 );

			}
			else {
				return d3.rgb( colourScale( ef ), 50, 50 );
			}
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