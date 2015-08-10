//so data can be sent to the server
var socket = io.connect("http://localhost:8000");

//inputs
var fileInput = document.getElementById( "fileInput" );
var savedFileInput = document.getElementById( "savedFileInput" );
var numOfNodes = document.getElementById( "numOfNodes" );

var patterns = []; //<-- the patterns and references to the entities they contain
var clusRef = new Object(); //<-- references the parents of a cluster
var simTable = new Object(); //<-- the Jaccard similarity between two patterns
var priorityQueue = []; //<-- orders patterns/clusters by similarity

//each element represents a level in the hierarchical clustering
var level = [];
var dataset = {}; 
var listOfDatasets = [];

//lists of entities and indexs
var entity = new Map();
var entityIDF; //<-- inverse document frequency of entity

//displays how high up the tree the user is
var fileName = document.getElementById( "fileName" );
var patternsPresent = document.getElementById( "patternsPresent" );
var totalNumOfPats; //<-- total number of patterns
var backOneVis = document.getElementById( "backOneVis" );

//create table tag
var total = new Map();

//how many colour groups the user wants
var numOfGroups = getNumOfGroups();

//table tools
var box = document.getElementById( "searchBar" );
var searchButton = document.getElementById( "searchButton" );
searchButton.addEventListener( "click", searchTable );
var topTenButton = document.getElementById( "topTenButton" );
topTenButton.addEventListener( "click", displayTopTen );

//force diagram components
var nodes = [], links = [];
var windowWidth = window.innerWidth;
var w = ((windowWidth / 100 ) * 90), h = 500;
var visDiv = document.getElementById("visual");
visDiv.style.width = w + "px";
var svg = d3.select("#visual")
			.append("svg")
			.attr("width", w)
			.attr("height", h)
			.attr("id", "svg");
var force = d3.layout.force();
var marker; //<-- tells user how many patterns are available (approximately)

//help button for visual
var visualHelpButton = document.getElementById( "visualHelpButton" );

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

//the button that opens and closes the right sidebar
var rightMenuButton = document.getElementById( "right-menu" );
rightMenuButton.addEventListener( "click", hideButton );

//---------------------- read file functions ----------------------

function upload() {
	if( fileInput.files.length > 0 ) {
		var file = fileInput.files[0];
		console.log( "Uploaded", file.name );

		var reader = new FileReader();
		readNewFile( file, reader );
	}
	else if( savedFileInput.files.length > 0 ) {
		var file = savedFileInput.files[0];
		console.log( "Uploaded", file.name );

		var reader = new FileReader();
		readOldFile( file, reader );
	}
	else {
		alert("File is empty");
	}
}

function readNewFile( file, reader ) {
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

function readOldFile( file, reader ) {
	reader.addEventListener("load", function() {

		//parse the data
		var data = JSON.parse( reader.result );
		console.log( "Finished reading" );

		//set global variables to values specified in file
		setGlobalVariables( data );

		//get rid of the loading spinner
		stopSpin();

		//visualise the data
		displayTools();
		displayHelpButton();
		visualise( level[ level.length - numOfGroups ] );
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

//-------------- send file contents to server function ------------

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
				"patterns": patterns,
				"clusRef": clusRef,
				"simTable": simTable,
				"priorityQueue": priorityQueue,
				"level": level
			};

			socket.emit("cluster", variables ); //<-- tell server to start function
			socket.emit( "progress" );

			socket.on( "progress", function( object ) {
				var grd = createColourGradient();
				ctx.fillStyle = grd;
				ctx.globalAlpha = 1;

				//calculate percentage of 1000
				var progress = object.p * 10;

				//update loading bar
				ctx.fillRect( 500, 190, progress, 20 ); 

				socket.emit( "progress" );
			});

			//update loading bar
			//var interval = setInterval( updateProgress, 100 );
			socket.on("cluster", function( variables ) {
				//clearInterval( interval );

				setGlobalVariables( variables );
				console.log( "Finished clustering" );

				stopSpin();

				displayTools();

				displayHelpButton();

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

function createColourGradient() {
	var grd = ctx.createLinearGradient( 500, 190, 1500, 210 );
	grd.addColorStop( "0", "#1f77b4" );
	grd.addColorStop( "0.1", "#ff7f0e" );
	grd.addColorStop( "0.2", "#2ca02c" );
	grd.addColorStop( "0.3", "#d62728" );
	grd.addColorStop( "0.4", "#9467bd" );
	grd.addColorStop( "0.5", "#8c564b" );
	grd.addColorStop( "0.6", "#e377c2" );
	grd.addColorStop( "0.7", "#7f7f7f" );
	grd.addColorStop( "0.8", "#bcbd22" );
	grd.addColorStop( "1", "#17becf" );
	
	return grd;
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
	patterns = variables.patterns;
	clusRef = variables.clusRef;
	simTable = variables.simTable;
	level = variables.level;

	//if loading a saved file, this will be true
	if( savedFileInput.files.length > 0 ){
		
		//convert Object into Map
		var done = false;
		var tmpEntity = new Map();
		count = 0;
		while( done === false ) {
			if( variables.entity[count] === undefined ) {
				done = true;
				entity = tmpEntity;
			}
			else {
				tmpEntity.set( count, variables.entity[count] );
				count++;
			}
		}
	}
}

//--------------------- visualisation functions -------------------

function displayTools() {
	var svg = document.getElementById( "svg" );
	var tableBox = document.getElementById( "tableBox" );

	visDiv.style.display = "block";
	svg.style.display = "block";
	tableBox.style.display = "block";
}

function displayHelpButton() {
	visualHelpButton.style.display = "block";
}

function visualise( clusters ) {
	//build dataset
	var originalNodes = getNodes( clusters );
	var n = getMoreNodes( originalNodes );
	var e = getEdges( n );
	dataset = { nodes: n, edges: e };

	var largestClus = getLargestCluster( n );

	//for highlighting and selecting colour groups of nodes
	groupButtons(); 

	//draw line to tell user approximately how many patterns are visable
	drawLine();

	//tells user precisely how many patterns are visible
	writeSidebarContent( n );

	//set inverse document frequency score for each entity
	entityIDF = setIDFs( dataset );
	
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

function groupButtons() {
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
			//put last dataset in array for back button
			var lastDataset = dataset;
			listOfDatasets.push( lastDataset );

			//display back button
			backOneVis.style.display = "block";

			//get new data
			dataset = newDataset( dataset, d );

			var largestClus = getLargestCluster( dataset.nodes );

			//determines size of nodes
			var rScale = d3.scale.linear()
						.domain([ 0, largestClus ])
						.range([5, 20]);

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

function goBackOneVis() {
	//one level below original visualisation
	if( listOfDatasets.length === 1 ) {
		resetVis();
		backOneVis.style.display = "none";
		listOfDatasets.pop();
	}
	//go back one
	else {
		//get previous dataset
		var oldDataset = listOfDatasets[ listOfDatasets.length - 1 ];

		var largestClus = getLargestCluster( oldDataset.nodes );
	
		//determines size of nodes
		var rScale = d3.scale.linear()
					.domain([ 0, largestClus ])
					.range([5, 20]);

		//change data in layout
		force.nodes(oldDataset.nodes)
			.links(oldDataset.edges)
			.start();
			
		nodes = nodes.data( oldDataset.nodes );
		links = links.data( oldDataset.edges );

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
		updateTable( oldDataset.nodes );

		updateLine( oldDataset.nodes );

		listOfDatasets.pop();
	}	
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

function setIDFs( dataset ) {
	var idfs = {}; //<-- inverse document frequency
	var nodes = dataset.nodes; //<-- clusters

	//loop through the entities and retieve and idf score for each
	for( var key of entity.keys() ) {
		var count = 0; //<-- number of clusters/nodes containing entity

		//loop through the clusters and count the ones that contain the entity
		for( var i = 0; i < nodes.length; i++ ) {
			var nodeFrequency = getFrequency( nodes[i].id );

			if( nodeFrequency.get( entity.get( key ) ) !== undefined ) {
				count++;
			}

		}

		/* divide the total number of patterns in node by how many contain 
		 the chosen entity. Then do the logarithm of these */
		idfs[entity.get( key )] = Math.log( nodes.length / count );
	}

	return idfs;
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

	//number of original nodes
	var numOfOrigNodes = originalNodes.length;

	//an object that records how many nodes each group currently has
	var groups = {}; 

	//fill the groups object with group names
	for( var i = 0; i < numOfOrigNodes; i++ ) {
		groups[ buttons[i] ] = 1;
	}

	var ready = false;

	/* keep retrieving the parents of nodes until each group has 
	specified number of nodes or just nodes one pattern long */
	while( ready === false ) {
		var onePat = 0; //<-- count how many patterns have no parents

		for( var i = 0; i < originalNodes.length; i++ ) {
			parents = clusRef[ originalNodes[i].id ];

			//if a cluster contains more than one pattern, get its parents
			if( parents.length !== 0 ) {
				//put parents into newNodes array
				node = { id: parents[0], class: originalNodes[i].class };
				newNodes.push( node );
				node = { id: parents[1], class: originalNodes[i].class };
				newNodes.push( node );

				//group now has one more node than before
				groups[ originalNodes[i].class ] += 1;
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

		for( var j = 0; j < numOfOrigNodes; j++ ) {
			if( groups[ buttons[j] ] >= numOfNodes.value ) { ready = true; }
		}
		if( ready === true ) { break; }

		//prepare to loop again
		if( ready === false ) {
			//prevents patterns turning up in newNodes more than once
			originalNodes = newNodes;
			newNodes = [];
		}
		
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
			best = mean( best, comparisons[i] );
		}
	}

	return best;
}

function mean( num1, num2 ) {
	var total = num1 + num2;
	total = total / 2;
	return total;
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
	writeSidebarContent( newDataset.nodes );

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

function writeSidebarContent( nodes, list ) {
	var numPats = 0;
	var nameOfFile = "";
	for( var i = 0; i < nodes.length; i++ ) {
		numPats += nodes[i].id.split( "-" ).length;
	}
	//check to see if using new dataset or saved file
	if( fileInput.files.length > 0 ) {
		nameOfFile = fileName.innerHTML = "File: " + fileInput.files[0].name;
	}
	else {
		nameOfFile = fileName.innerHTML = "File: " + savedFileInput.files[0].name;
	}
	totalNumOfPats = numPats;

	$("#right-menu").sidr({
		name: "sidr-right",
		side: "right",
		source: function( name ) {
			if( list === undefined ) {
				return "<h2>" + nameOfFile + "</h2><h3>Patterns Present: " + numPats + "</h3>";
			}
			else {
				return "<h2>" + nameOfFile + "</h2><h3>Patterns Present: " + numPats + "</h3>" + list;
			}
		}
	});
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
	var frequency = getFrequency( d.id );

	var numOfPats = d.id.split( "-" ).length; //<-- number of patterns
	var text = "Number of Patterns: " + numOfPats;
	var percentage = (numOfPats / totalNumOfPats) * 100;
	text += " Percentage of total: " + percentage + "%";

	d3.select("#tooltip")
		.select("#value")
		.text( text );

	d3.select("#tooltip").classed("hidden", false);
}

function hideTooltip() {
	d3.select("#tooltip").classed("hidden", true);
}

function clickNode( d ) {
	//total number of patterns in cluster
	var clusSize = d.id.split("-").length;

	//work out percentage of patterns this entity turns up in
	var frequency = getFrequency( d.id ); 

	//array of list
	var list = createList( frequency, clusSize );

	//sort list
	list = sortByIdf( list );

	//create html string of list and put in right sidebar
	var htmlList = createHtmlList( list );

	//write content into right sidebar
	writeSidebarContent( dataset.nodes, htmlList );

	//click button to open right sidebar
	rightMenuButton.click();
	rightMenuButton.style.display = "block";
}

function createList( frequency, clusSize ) {
	var list = [];
	//add new entity and idf per loop. Add each to list
	for( var key of frequency.keys() ) {
		//work out term frequency
		var ef = frequency.get( key ); //<-- entity frequency (patterns containing entity)
		var tf = ef / clusSize; //<-- term frequency

		//get inverse document frequency
		var idf = entityIDF[key];

		//add to list
		var item = {
			"key": key,
			"idf": idf
		};
		list.push( item );	
	}
	return list;
}

function createHtmlList( list ) {
	var htmlList = "<ul>";
	for( var j = 0; j < list.length; j++ ) {
		//create new item and add to list
		var itemContent = list[j].key.toString() + " : " + list[j].idf.toString();
		var li = "<li>" + itemContent + "</li>";
		htmlList = htmlList + li;
	}
	htmlList = htmlList + "</ul>";
	return htmlList;
}

function sortByIdf( array ) {
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
    return mergeByIdf( sortByIdf( left ), sortByIdf( right ) );
}

function mergeByIdf( left, right ) {
	var result = [], il = 0, ir = 0;

    /* Compare elements from left and right arrays adding smaller one to 
    result array. Do this until one of the arrays is empty. */
    while ( il < left.length && ir < right.length ){
        if( left[il].idf > right[ir].idf ){
            result.push( left[il++] );
        } 
        else {
            result.push( right[ir++] );
        }
    }

    //concat what is left of left and right to result
    return result.concat( left.slice(il) ).concat( right.slice(ir) );
}

function hideButton() {
	rightMenuButton.style.display = "none";
}

function tick() {
	links.attr("x1", function(d) { return d.source.x; } )
		.attr("y1", function(d) { return d.source.y; } )
		.attr("x2", function(d) { return d.source.x; } )
		.attr("y2", function(d) { return d.source.y; } );
	
	nodes.attr("cx", function(d) { return d.x; } )
		.attr("cy", function(d) { return d.y; } );
}

//------------------- create frequency table functions -------------------

function createTable( clusters ) {
	createTableHead();

	var sortedTotal = getSortedTotal( clusters );
	sortedTotal = sortedTotal.splice( 0, 10 );

	var tableEntityList = document.getElementById( "tableEntities" );
	var tableFrequencyList = document.getElementById( "tableFrequency" );
	
	//create new rows for the table
	for( var i = 0; i < sortedTotal.length; i++ ) {
		//add new entity name to list
		var li = document.createElement( "li" );
		li.appendChild( document.createTextNode( sortedTotal[i].pattern ) );
		tableEntityList.appendChild( li );

		//add new Frequency to list
		var li2 = document.createElement( "li" );

		if( sortedTotal[i].frequency === undefined ) {
			li2.appendChild( document.createTextNode( "0 (0%)" ) );
			
		}
		else {
			var percentage = Math.floor( (sortedTotal[i].frequency / totalNumOfPats) * 100 );
			li2.appendChild( document.createTextNode( sortedTotal[i].frequency + " (" + percentage + "%)" ) );
		}
		tableFrequencyList.appendChild( li2 );
	}

	//display lists
	document.getElementById( "tableEntities" ).style.display = "inline-block";
	document.getElementById( "tableFrequency" ).style.display = "inline-block";

	//add click function to each row in table
	tableEntityList.addEventListener( "click", function(e) {
		console.log( e.target.innerHTML );
		for( var j = 0; j < sortedTotal.length; j++ ) {
			if( sortedTotal[j].pattern === e.target.innerHTML ) {
				clickRow( sortedTotal[j].pattern, sortedTotal[j].frequency );
			}
		}
	});

	/*

	//deselect rows and return nodes stroke to black
	d3.select("#deselect")
		.on("click", deselectRows );

	*/
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
	//add up the frequency of all entities in this dataset
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

function combine( clusEnts1, clusEnts2 ) {
	//loop through all entities and their frequency in clusEnts2
	for( var key of clusEnts2.keys() ) {
		if( clusEnts1.has( key ) ) {
			//add frequency of clusEnts1 and clusEnts2 together
			clusEnts1.set( key, clusEnts1.get( key ) + clusEnts2.get( key ) );
		}
		else {
			//put in new entity and its frequency
			clusEnts1.set( key, clusEnts2.get( key ) );
		}
	}

	return clusEnts1;
}

function sortTotal( total ) {
	var sortedTotal = [];
	//insertion sort
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

function createTableHead() {
	document.getElementById( "tableEntitiesHead" ).innerHTML = "Entity";
	document.getElementById( "tableFrequencyHead" ).innerHTML = "Frequency";
}

function clickRow( rowPattern, totalFrequency ) {
	//determines the max number of a specific entity a cluster could hold
	var largestClus = getLargestCluster( dataset.nodes );

	//determines intensity of red
	var colourScale = d3.scale.linear()
		.domain([0, 100])
		.range([100, 255]);

	//de-highlight all rows

	//highlight selected row

	//change the border of each node to a shade of red
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

	//change data in tooltip to match the data of the node currently hovered over
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
					return rowPattern + " 0 0%";
				}
				else {
					var numOfPats = d.id.split( "-" ).length; //<-- number of patterns
					var percentage = Math.floor( (patternFrequency / numOfPats) * 100 ); 
					return rowPattern + " " + patternFrequency + " (" + percentage + "%)";
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

function searchTable() {
	//show top ten button and get value in text input box
	topTenButton.style.display = "inline-block";
	var patKey = document.getElementById( "textInput" ).value;

	//empty list that makes up the table
	$("#tableEntities").empty();
	$("#tableFrequency").empty();

	//run through list of entities and store any that match search
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

	//the two columns in the table
	var tableEntityList = document.getElementById( "tableEntities" );
	var tableFrequencyList = document.getElementById( "tableFrequency" );

	//fill the two columns with the entities and frequencies found
	for( var i = 0; i < entities.length; i++ ) {
		//add new entity name to list
		var li = document.createElement( "li" );
		li.appendChild( document.createTextNode( entities[i].pattern ) );
		tableEntityList.appendChild( li );

		//add new Frequency to list
		var li2 = document.createElement( "li" );

		if( entities[i].frequency === undefined ) {
			li2.appendChild( document.createTextNode( "0 (0%)" ) );
			
		}
		else {
			var percentage = Math.floor( (entities[i].frequency / totalNumOfPats) * 100 );
			li2.appendChild( document.createTextNode( entities[i].frequency + " (" + percentage + "%)" ) );
		}
		tableFrequencyList.appendChild( li2 );
	}
}

function displayTopTen() {
	var tableEntityList = document.getElementById( "tableEntities" );
	var tableFrequencyList = document.getElementById( "tableFrequency" );

	//empty list that makes up the table
	$("#tableEntities").empty();
	$("#tableFrequency").empty();
	
	//get all entities
	var clusters = level[ level.length - numOfGroups ];
	var sortedTotal = sortTotal( total );
	sortedTotal = sortedTotal.splice( 0, 10 );
	
	//create new rows for the table
	for( var i = 0; i < sortedTotal.length; i++ ) {
		//add new entity name to list
		var li = document.createElement( "li" );
		li.appendChild( document.createTextNode( sortedTotal[i].pattern ) );
		tableEntityList.appendChild( li );

		//add new Frequency to list
		var li2 = document.createElement( "li" );

		if( sortedTotal[i].frequency === undefined ) {
			li2.appendChild( document.createTextNode( "0 (0%)" ) );
			
		}
		else {
			var percentage = Math.floor( (sortedTotal[i].frequency / totalNumOfPats) * 100 );
			li2.appendChild( document.createTextNode( sortedTotal[i].frequency + " (" + percentage + "%)" ) );
		}
		tableFrequencyList.appendChild( li2 );
	}

	//hide top ten button
	topTenButton.style.display = "none";
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

//--------------------------- save file functions -----------------------------

function clickSave() {
	console.log( "Clicked save" );
	sendFile();
}

function sendFile() {
	var file;
	if( fileInput.files.length > 0 ) {
		file = fileInput.files[0];
	}
	else {
		file = savedFileInput.files[0];
	}

	//change variable from Map data type to object data type
	var objectEntity = mapToObject();

	//create object holding variables needed to create save file
	var variables = setVariables( file, objectEntity );

	socket.emit( "save", variables );
	socket.on("save", function() {
		console.log( "File Saved" );

		//create href that will fire download function in server
		var downloadFileName = document.getElementById( "downloadFileName" );
		var jsonFileName = variables.fileName.split( "." );
		jsonFileName = "/download?file=" + jsonFileName[0];

		//create and click link that sends file to server as an attachment
		var downloadButton = document.createElement( "a" );
		downloadButton.setAttribute( "href", jsonFileName );
		downloadButton.click();
		console.log( jsonFileName );
	});
}

function setVariables( file, objectEntity ) {
	var variables = {
		"fileName": file.name,
		"patterns": patterns,
		"clusRef": clusRef,
		"simTable": simTable,
		"level": level,
		"entity": objectEntity
	};
	return variables;
}

function mapToObject() {
	var objectEntity = new Object();

	for( var key of entity.keys() ) {
		objectEntity[key] = entity.get(key);
	}

	return objectEntity;
}